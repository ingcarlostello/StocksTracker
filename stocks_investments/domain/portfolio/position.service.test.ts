import { describe, expect, it } from "vitest";
import type { TransactionLike, TransactionType } from "../transactions/transaction.type";
import { OversellError } from "./position.errors";
import {
  applyTransaction,
  buildPositions,
  emptyPosition,
  findCandidateOversell,
  sellCostBasis,
  tryBuildPositions,
  validateSellSequence,
} from "./position.service";
import { CANDIDATE_TRANSACTION_ID, SHARES_EPSILON } from "./portfolio.constants";

function makeFactory() {
  let sequence = 0;
  return function tx(
    type: TransactionType,
    ticker: string,
    quantity: number,
    price: number,
    date = "2025-01-02",
  ): TransactionLike {
    sequence += 1;
    return {
      id: `t${String(sequence).padStart(3, "0")}`,
      ticker,
      type,
      date,
      quantity,
      price,
      totalAmount: quantity * price,
      createdAt: sequence,
    };
  }
}

describe("applyTransaction", () => {
  const tx = makeFactory();

  it("adds shares and cost on a BUY", () => {
    const position = applyTransaction(emptyPosition("AAPL"), tx("BUY", "AAPL", 1, 100));
    expect(position).toEqual({ ticker: "AAPL", shares: 1, costBasis: 100, realizedGain: 0 });
  });

  it("does not mutate the input position", () => {
    const start = emptyPosition("AAPL");
    applyTransaction(start, tx("BUY", "AAPL", 1, 100));
    expect(start).toEqual({ ticker: "AAPL", shares: 0, costBasis: 0, realizedGain: 0 });
  });

  it("rejects a transaction for another ticker", () => {
    expect(() => applyTransaction(emptyPosition("AAPL"), tx("BUY", "MSFT", 1, 100))).toThrow();
  });

  it("throws OversellError with the violation details", () => {
    const held = { ticker: "AAPL", shares: 2, costBasis: 200, realizedGain: 0 };
    const sell = tx("SELL", "AAPL", 3, 120, "2025-02-01");
    expect(() => applyTransaction(held, sell)).toThrow(OversellError);
    try {
      applyTransaction(held, sell);
    } catch (error) {
      expect((error as OversellError).violation).toEqual({
        ticker: "AAPL",
        date: "2025-02-01",
        transactionId: sell.id,
        available: 2,
        requested: 3,
      });
    }
  });
});

describe("sellCostBasis", () => {
  const position = { ticker: "AAPL", shares: 20, costBasis: 3000, realizedGain: 0 };

  it("removes quantity × average cost", () => {
    expect(sellCostBasis(position, 5)).toBe(750);
  });

  it("removes the whole basis when selling every share", () => {
    expect(sellCostBasis(position, 20)).toBe(3000);
  });

  it("refuses to remove cost for more shares than are held", () => {
    expect(() => sellCostBasis(position, 21)).toThrow(RangeError);
  });
});

describe("buildPositions with BUY only", () => {
  it("spec example: BUY 1 @ 100 + BUY 1 @ 200 → 2 shares, 300 invested", () => {
    const tx = makeFactory();
    const [position] = buildPositions([tx("BUY", "AAPL", 1, 100), tx("BUY", "AAPL", 1, 200)]);
    expect(position).toEqual({ ticker: "AAPL", shares: 2, costBasis: 300, realizedGain: 0 });
  });

  it("keeps each ticker separate and sorts positions by ticker", () => {
    const tx = makeFactory();
    const positions = buildPositions([
      tx("BUY", "MSFT", 2, 50),
      tx("BUY", "AAPL", 1, 100),
      tx("BUY", "MSFT", 1, 80),
    ]);
    expect(positions).toEqual([
      { ticker: "AAPL", shares: 1, costBasis: 100, realizedGain: 0 },
      { ticker: "MSFT", shares: 3, costBasis: 180, realizedGain: 0 },
    ]);
  });

  it("supports fractional shares", () => {
    const tx = makeFactory();
    const [position] = buildPositions([tx("BUY", "VOO", 0.25, 400), tx("BUY", "VOO", 0.5, 420)]);
    expect(position.shares).toBeCloseTo(0.75, 12);
    expect(position.costBasis).toBeCloseTo(310, 10);
  });

  it("returns no positions for no transactions", () => {
    expect(buildPositions([])).toEqual([]);
  });
});

describe("buildPositions with SELL (average cost)", () => {
  it("spec example: BUY 10 @ 100, SELL 4 @ 130 → 6 shares, basis 600, realized +120", () => {
    const tx = makeFactory();
    const [position] = buildPositions([tx("BUY", "AAPL", 10, 100), tx("SELL", "AAPL", 4, 130)]);
    expect(position).toEqual({ ticker: "AAPL", shares: 6, costBasis: 600, realizedGain: 120 });
  });

  it("BUY 10 @ 100, BUY 10 @ 200, SELL 5 @ 250 → 15 shares, basis 2250, realized +500", () => {
    const tx = makeFactory();
    const [position] = buildPositions([
      tx("BUY", "AAPL", 10, 100),
      tx("BUY", "AAPL", 10, 200),
      tx("SELL", "AAPL", 5, 250),
    ]);
    expect(position).toEqual({ ticker: "AAPL", shares: 15, costBasis: 2250, realizedGain: 500 });
  });

  it("keeps the average cost unchanged after a sale", () => {
    const tx = makeFactory();
    const [position] = buildPositions([
      tx("BUY", "AAPL", 3, 100),
      tx("BUY", "AAPL", 1, 140),
      tx("SELL", "AAPL", 2, 90),
    ]);
    expect(position.costBasis / position.shares).toBeCloseTo(110, 10);
    expect(position.realizedGain).toBeCloseTo(-40, 10);
  });

  it("accumulates realized gain across several sales, including the closing one", () => {
    const tx = makeFactory();
    const [position] = buildPositions([
      tx("BUY", "AAPL", 10, 100),
      tx("SELL", "AAPL", 2, 120),
      tx("SELL", "AAPL", 3, 130),
      tx("SELL", "AAPL", 5, 90),
    ]);
    expect(position).toEqual({ ticker: "AAPL", shares: 0, costBasis: 0, realizedGain: 80 });
  });

  it("keeps a small real remainder open instead of closing it", () => {
    const tx = makeFactory();
    const [position] = buildPositions([tx("BUY", "VOO", 1, 400), tx("SELL", "VOO", 0.995, 410)]);
    expect(position.shares).toBeCloseTo(0.005, 12);
    expect(position.costBasis).toBeCloseTo(2, 9);
    expect(position.realizedGain).toBeCloseTo(9.95, 9);
  });

  it("records a realized loss", () => {
    const tx = makeFactory();
    const [position] = buildPositions([tx("BUY", "TSLA", 4, 250), tx("SELL", "TSLA", 4, 200)]);
    expect(position).toEqual({ ticker: "TSLA", shares: 0, costBasis: 0, realizedGain: -200 });
  });

  it("closes the position exactly despite float residue (0.1 + 0.2 − 0.3)", () => {
    const tx = makeFactory();
    const [position] = buildPositions([
      tx("BUY", "VOO", 0.1, 400),
      tx("BUY", "VOO", 0.2, 400),
      tx("SELL", "VOO", 0.3, 400),
    ]);
    expect(position.shares).toBe(0);
    expect(position.costBasis).toBe(0);
    expect(position.realizedGain).toBeCloseTo(0, 9);
  });

  it("starts a fresh average cost after the position is closed and reopened", () => {
    const tx = makeFactory();
    const [position] = buildPositions([
      tx("BUY", "AAPL", 2, 100),
      tx("SELL", "AAPL", 2, 150),
      tx("BUY", "AAPL", 1, 300),
    ]);
    expect(position).toEqual({ ticker: "AAPL", shares: 1, costBasis: 300, realizedGain: 100 });
  });

  it("replays in date order, not input order", () => {
    const tx = makeFactory();
    const sell = tx("SELL", "AAPL", 5, 150, "2025-03-01");
    const buyLater = tx("BUY", "AAPL", 10, 300, "2025-04-01");
    const buyEarlier = tx("BUY", "AAPL", 10, 100, "2025-01-01");
    const [position] = buildPositions([sell, buyLater, buyEarlier]);
    // Average at the sale is 100 (only the January buy), so the sale realizes +250.
    expect(position).toEqual({ ticker: "AAPL", shares: 15, costBasis: 3500, realizedGain: 250 });
  });

  it("orders same-day trades by entry time", () => {
    const tx = makeFactory();
    const sellFirst = tx("SELL", "AAPL", 1, 100, "2025-01-02");
    const buyAfter = tx("BUY", "AAPL", 1, 100, "2025-01-02");
    expect(() => buildPositions([buyAfter, sellFirst])).toThrow(OversellError);
  });

  it("does not mix tickers when selling", () => {
    const tx = makeFactory();
    expect(() => buildPositions([tx("BUY", "MSFT", 5, 100), tx("SELL", "AAPL", 1, 100)])).toThrow(
      OversellError,
    );
  });
});

describe("findCandidateOversell", () => {
  const input = (type: TransactionType, quantity: number, date = "2025-03-01", ticker = "AAPL") => ({
    ticker,
    type,
    date,
    quantity,
    price: 100,
  });

  it("never flags a BUY", () => {
    expect(findCandidateOversell([], input("BUY", 5))).toBeNull();
  });

  it("allows a SELL covered by earlier buys", () => {
    const tx = makeFactory();
    expect(findCandidateOversell([tx("BUY", "AAPL", 10, 100, "2025-01-01")], input("SELL", 10))).toBeNull();
  });

  it("flags a SELL larger than the shares held on its date", () => {
    const tx = makeFactory();
    const violation = findCandidateOversell([tx("BUY", "AAPL", 3, 100, "2025-01-01")], input("SELL", 4));
    expect(violation).toEqual({
      ticker: "AAPL",
      date: "2025-03-01",
      transactionId: CANDIDATE_TRANSACTION_ID,
      available: 3,
      requested: 4,
    });
  });

  it("flags a SELL dated before the buy that would fund it", () => {
    const tx = makeFactory();
    expect(findCandidateOversell([tx("BUY", "AAPL", 10, 100, "2025-06-01")], input("SELL", 1, "2025-03-01"))).not.toBeNull();
  });

  it("places the candidate after stored trades on the same day, like the server", () => {
    const tx = makeFactory();
    const sameDayBuy = { ...tx("BUY", "AAPL", 5, 100, "2025-03-01"), createdAt: 9_000_000_000_000 };
    expect(findCandidateOversell([sameDayBuy], input("SELL", 5, "2025-03-01"))).toBeNull();
  });

  it("ignores other tickers", () => {
    const tx = makeFactory();
    expect(findCandidateOversell([tx("BUY", "MSFT", 10, 100, "2025-01-01")], input("SELL", 1))).not.toBeNull();
  });

  it("reports a later stored SELL that the new SELL would leave uncovered", () => {
    const tx = makeFactory();
    const laterSell = tx("SELL", "AAPL", 6, 100, "2025-05-01");
    const violation = findCandidateOversell(
      [tx("BUY", "AAPL", 10, 100, "2025-01-01"), laterSell],
      input("SELL", 5, "2025-03-01"),
    );
    expect(violation).toMatchObject({ transactionId: laterSell.id, available: 5, requested: 6 });
  });
});

describe("tryBuildPositions", () => {
  it("returns the positions for a valid history", () => {
    const tx = makeFactory();
    expect(tryBuildPositions([tx("BUY", "AAPL", 2, 100)])).toEqual({
      ok: true,
      positions: [{ ticker: "AAPL", shares: 2, costBasis: 200, realizedGain: 0 }],
    });
  });

  it("returns the violation instead of throwing for an invalid history", () => {
    const tx = makeFactory();
    const sell = tx("SELL", "AAPL", 1, 100);
    expect(tryBuildPositions([sell])).toEqual({
      ok: false,
      violation: { ticker: "AAPL", date: sell.date, transactionId: sell.id, available: 0, requested: 1 },
    });
  });
});

describe("validateSellSequence", () => {
  it("accepts a valid history", () => {
    const tx = makeFactory();
    expect(validateSellSequence([tx("BUY", "AAPL", 2, 100), tx("SELL", "AAPL", 2, 110)])).toEqual({
      ok: true,
    });
  });

  it("rejects a SELL with no prior BUY", () => {
    const tx = makeFactory();
    const sell = tx("SELL", "AAPL", 1, 100);
    expect(validateSellSequence([sell])).toEqual({
      ok: false,
      violation: { ticker: "AAPL", date: sell.date, transactionId: sell.id, available: 0, requested: 1 },
    });
  });

  it("rejects selling more than held", () => {
    const tx = makeFactory();
    const result = validateSellSequence([tx("BUY", "AAPL", 10, 100), tx("SELL", "AAPL", 10.5, 100)]);
    expect(result.ok).toBe(false);
  });

  it("rejects selling just beyond the float tolerance", () => {
    const tx = makeFactory();
    const result = validateSellSequence([
      tx("BUY", "AAPL", 10, 100),
      tx("SELL", "AAPL", 10 + SHARES_EPSILON * 10, 100),
    ]);
    expect(result.ok).toBe(false);
  });

  it("rejects a sale smaller than the tolerance when nothing is held", () => {
    const tx = makeFactory();
    expect(validateSellSequence([tx("SELL", "AAPL", SHARES_EPSILON / 2, 100)]).ok).toBe(false);
  });

  it("reports the earliest of several violations in canonical order", () => {
    const tx = makeFactory();
    const late = tx("SELL", "AAPL", 20, 100, "2025-03-01");
    const early = tx("SELL", "AAPL", 12, 100, "2025-02-01");
    const result = validateSellSequence([late, tx("BUY", "AAPL", 10, 100, "2025-01-01"), early]);
    expect(result).toEqual({
      ok: false,
      violation: { ticker: "AAPL", date: "2025-02-01", transactionId: early.id, available: 10, requested: 12 },
    });
  });

  it("reports the earliest violation across tickers by date, not by ticker name", () => {
    const tx = makeFactory();
    const aapl = tx("SELL", "AAPL", 1, 100, "2025-02-01");
    const msft = tx("SELL", "MSFT", 1, 100, "2025-01-01");
    const result = validateSellSequence([aapl, msft]);
    expect(result.ok === false && result.violation.ticker).toBe("MSFT");
  });

  it("rejects a SELL dated before the BUY that funds it", () => {
    const tx = makeFactory();
    const buy = tx("BUY", "AAPL", 10, 100, "2025-01-10");
    const sell = tx("SELL", "AAPL", 5, 120, "2025-01-05");
    const result = validateSellSequence([buy, sell]);
    expect(result).toEqual({
      ok: false,
      violation: { ticker: "AAPL", date: "2025-01-05", transactionId: sell.id, available: 0, requested: 5 },
    });
  });

  it("reports the first violation when a later SELL depletes an earlier position", () => {
    const tx = makeFactory();
    const first = tx("SELL", "AAPL", 6, 100, "2025-02-01");
    const second = tx("SELL", "AAPL", 6, 100, "2025-03-01");
    const result = validateSellSequence([tx("BUY", "AAPL", 10, 100, "2025-01-01"), second, first]);
    expect(result).toEqual({
      ok: false,
      violation: { ticker: "AAPL", date: "2025-03-01", transactionId: second.id, available: 4, requested: 6 },
    });
  });

  it("tolerates float noise up to SHARES_EPSILON when selling everything", () => {
    const tx = makeFactory();
    const result = validateSellSequence([
      tx("BUY", "AAPL", 10, 100),
      tx("SELL", "AAPL", 10 + SHARES_EPSILON / 2, 100),
    ]);
    expect(result).toEqual({ ok: true });
  });
});
