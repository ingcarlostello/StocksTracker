import { describe, expect, it } from "vitest";
import type {
  OversellViolation,
  TransactionInput,
  TransactionLike,
  TransactionType,
} from "../transactions/transaction.type";
import { OversellError } from "./position.errors";
import {
  applyTransaction,
  buildPositions,
  combinePositions,
  emptyPosition,
  findCandidateOversell,
  findRemovalOversell,
  findUpdateOversell,
  isOpenPosition,
  sellCostBasis,
  tryBuildPositions,
  validateSellSequence,
} from "./position.service";
import { CANDIDATE_TRANSACTION_ID, SHARES_EPSILON } from "./portfolio.constants";

const PORTFOLIO = "p-retiro";
const OTHER_PORTFOLIO = "p-viajes";

function makeFactory() {
  let sequence = 0;
  return function tx(
    type: TransactionType,
    ticker: string,
    quantity: number,
    price: number,
    date = "2025-01-02",
    portfolioId = PORTFOLIO,
  ): TransactionLike {
    sequence += 1;
    return {
      id: `t${String(sequence).padStart(3, "0")}`,
      portfolioId,
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

// A not-yet-saved transaction for findCandidateOversell.
function input(type: TransactionType, quantity: number, date = "2025-03-01", ticker = "AAPL", portfolioId = PORTFOLIO) {
  return { portfolioId, ticker, type, date, quantity, price: 100 };
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

describe("isOpenPosition", () => {
  it("uses SHARES_EPSILON as the threshold", () => {
    expect(isOpenPosition({ shares: 0 })).toBe(false);
    expect(isOpenPosition({ shares: SHARES_EPSILON })).toBe(false);
    expect(isOpenPosition({ shares: 1.0000001e-9 })).toBe(true);
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

describe("positions across portfolios", () => {
  it("keeps the average cost of each portfolio separate and adds up the combined position", () => {
    const tx = makeFactory();
    const positions = buildPositions([
      tx("BUY", "TSLA", 1, 100, "2025-01-02", PORTFOLIO),
      tx("BUY", "TSLA", 1, 300, "2025-01-03", OTHER_PORTFOLIO),
      // At average cost 100 in Retiro this realizes +50; a mixed replay would use 200 and realize −50.
      tx("SELL", "TSLA", 1, 150, "2025-01-04", PORTFOLIO),
    ]);
    expect(positions).toEqual([{ ticker: "TSLA", shares: 1, costBasis: 300, realizedGain: 50 }]);
  });

  it("rejects a SELL funded only by another portfolio's shares", () => {
    const tx = makeFactory();
    const sell = tx("SELL", "TSLA", 1, 150, "2025-01-04", PORTFOLIO);
    expect(validateSellSequence([tx("BUY", "TSLA", 5, 100, "2025-01-02", OTHER_PORTFOLIO), sell])).toEqual({
      ok: false,
      violation: { ticker: "TSLA", date: "2025-01-04", transactionId: sell.id, available: 0, requested: 1 },
    });
  });

  it("gives one portfolio the same positions whether or not other portfolios are replayed with it", () => {
    const tx = makeFactory();
    const retiro = [
      tx("BUY", "AAPL", 10, 100, "2025-01-02", PORTFOLIO),
      tx("SELL", "AAPL", 4, 130, "2025-02-01", PORTFOLIO),
    ];
    const viajes = [tx("BUY", "MSFT", 3, 50, "2025-01-05", OTHER_PORTFOLIO)];
    const all = buildPositions([...viajes, ...retiro]);
    expect(all.filter((position) => position.ticker === "AAPL")).toEqual(buildPositions(retiro));
    expect(all).toEqual(combinePositions([...buildPositions(retiro), ...buildPositions(viajes)]));
  });

  it("closes each portfolio's position independently before combining", () => {
    const tx = makeFactory();
    const [position] = buildPositions([
      tx("BUY", "VOO", 0.1, 400, "2025-01-02", PORTFOLIO),
      tx("BUY", "VOO", 0.2, 400, "2025-01-02", PORTFOLIO),
      tx("SELL", "VOO", 0.3, 410, "2025-01-03", PORTFOLIO),
      tx("BUY", "VOO", 2, 500, "2025-01-04", OTHER_PORTFOLIO),
    ]);
    expect(position.shares).toBe(2);
    expect(position.costBasis).toBe(1000);
  });

  it("settles sub-epsilon leftovers of each portfolio before combining", () => {
    const tx = makeFactory();
    // Each 6e-10 buy is dust on its own, but together they would exceed SHARES_EPSILON.
    const positions = buildPositions([
      tx("BUY", "AAPL", 6e-10, 100, "2025-01-02", PORTFOLIO),
      tx("BUY", "AAPL", 6e-10, 100, "2025-01-02", OTHER_PORTFOLIO),
    ]);
    expect(positions).toEqual([{ ticker: "AAPL", shares: 0, costBasis: 0, realizedGain: 0 }]);
  });

  it("never lets another portfolio's dust leak into a combined position", () => {
    const tx = makeFactory();
    const [position] = buildPositions([
      tx("BUY", "AAPL", 5e-10, 1e6, "2025-01-02", PORTFOLIO),
      tx("BUY", "AAPL", 10, 100, "2025-01-02", OTHER_PORTFOLIO),
    ]);
    expect(position.shares).toBe(10);
    expect(position.costBasis).toBe(1000);
  });

  it("keeps the realized gain of a settled position", () => {
    const tx = makeFactory();
    const positions = buildPositions([
      tx("BUY", "AAPL", 1, 100, "2025-01-02"),
      tx("SELL", "AAPL", 1, 150, "2025-01-03"),
      tx("BUY", "AAPL", 5e-10, 100, "2025-01-04"),
    ]);
    expect(positions).toEqual([{ ticker: "AAPL", shares: 0, costBasis: 0, realizedGain: 50 }]);
  });

  it("ignores another portfolio's shares in the candidate check", () => {
    const tx = makeFactory();
    const otherBuy = tx("BUY", "AAPL", 10, 100, "2025-01-01", OTHER_PORTFOLIO);
    expect(findCandidateOversell([otherBuy], input("SELL", 1))).not.toBeNull();
    expect(findCandidateOversell([otherBuy], input("SELL", 1, "2025-03-01", "AAPL", OTHER_PORTFOLIO))).toBeNull();
  });

  it("ignores a violation in another portfolio when checking a candidate", () => {
    const tx = makeFactory();
    const brokenOther = tx("SELL", "AAPL", 99, 100, "2025-01-01", OTHER_PORTFOLIO);
    const buy = tx("BUY", "AAPL", 10, 100, "2025-01-01", PORTFOLIO);
    expect(findCandidateOversell([brokenOther, buy], input("SELL", 5))).toBeNull();
  });
});

describe("moving a transaction between portfolios", () => {
  // Mirrors convex/transactions.ts update: both the destination and the source position are re-checked.
  it("is rejected in the source portfolio when a moved BUY leaves its SELL uncovered", () => {
    const tx = makeFactory();
    const buy = tx("BUY", "TSLA", 5, 100, "2025-01-02", PORTFOLIO);
    const sell = tx("SELL", "TSLA", 2, 120, "2025-01-03", PORTFOLIO);
    const moved = { ...buy, portfolioId: OTHER_PORTFOLIO };
    const history = [moved, sell];
    const destination = history.filter((t) => t.portfolioId === OTHER_PORTFOLIO);
    const source = history.filter((t) => t.portfolioId === PORTFOLIO);
    expect(validateSellSequence(destination)).toEqual({ ok: true });
    expect(validateSellSequence(source)).toMatchObject({ ok: false, violation: { transactionId: sell.id, available: 0 } });
  });

  it("is rejected in the destination portfolio when a moved SELL has nothing to sell there", () => {
    const tx = makeFactory();
    const buy = tx("BUY", "TSLA", 5, 100, "2025-01-02", PORTFOLIO);
    const sell = tx("SELL", "TSLA", 2, 120, "2025-01-03", PORTFOLIO);
    const history = [buy, { ...sell, portfolioId: OTHER_PORTFOLIO }];
    expect(validateSellSequence(history.filter((t) => t.portfolioId === PORTFOLIO))).toEqual({ ok: true });
    expect(validateSellSequence(history.filter((t) => t.portfolioId === OTHER_PORTFOLIO)).ok).toBe(false);
  });
});

describe("combinePositions", () => {
  it("adds shares, cost basis and realized gain per ticker and sorts by ticker", () => {
    expect(
      combinePositions([
        { ticker: "MSFT", shares: 1, costBasis: 50, realizedGain: 5 },
        { ticker: "AAPL", shares: 2, costBasis: 200, realizedGain: 0 },
        { ticker: "MSFT", shares: 3, costBasis: 90, realizedGain: -2 },
      ]),
    ).toEqual([
      { ticker: "AAPL", shares: 2, costBasis: 200, realizedGain: 0 },
      { ticker: "MSFT", shares: 4, costBasis: 140, realizedGain: 3 },
    ]);
  });

  it("does not mutate its input", () => {
    const position = { ticker: "AAPL", shares: 2, costBasis: 200, realizedGain: 0 };
    combinePositions([position, { ...position }]);
    expect(position).toEqual({ ticker: "AAPL", shares: 2, costBasis: 200, realizedGain: 0 });
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

// The input fields of a stored transaction, as the edit form would submit them untouched.
function inputOf(transaction: TransactionLike): TransactionInput {
  const { portfolioId, ticker, type, date, quantity, price } = transaction;
  return { portfolioId, ticker, type, date, quantity, price };
}

describe("findUpdateOversell", () => {
  it("accepts an unchanged valid history", () => {
    const tx = makeFactory();
    const buy = tx("BUY", "AAPL", 10, 100, "2025-01-01");
    const sell = tx("SELL", "AAPL", 4, 120, "2025-02-01");
    const history = [buy, sell];
    expect(findUpdateOversell(history, sell, inputOf(sell))).toBeNull();
    expect(findUpdateOversell(history, buy, inputOf(buy))).toBeNull();
  });

  it("reports the later saved SELL when a BUY is lowered below it", () => {
    const tx = makeFactory();
    const buy = tx("BUY", "AAPL", 10, 100, "2025-01-01");
    const sell = tx("SELL", "AAPL", 6, 120, "2025-02-01");
    expect(findUpdateOversell([buy, sell], buy, { ...inputOf(buy), quantity: 5 })).toEqual({
      ticker: "AAPL",
      date: "2025-02-01",
      transactionId: sell.id,
      available: 5,
      requested: 6,
    });
  });

  it("reports the edited SELL itself when it is raised above the holdings", () => {
    const tx = makeFactory();
    const buy = tx("BUY", "AAPL", 10, 100, "2025-01-01");
    const sell = tx("SELL", "AAPL", 4, 120, "2025-02-01");
    expect(findUpdateOversell([buy, sell], sell, { ...inputOf(sell), quantity: 12 })).toEqual({
      ticker: "AAPL",
      date: "2025-02-01",
      transactionId: sell.id,
      available: 10,
      requested: 12,
    });
  });

  it("keeps the stored createdAt, so a same-day BUY entered before its SELL can be corrected", () => {
    const tx = makeFactory();
    const buy = tx("BUY", "AAPL", 5, 100, "2025-03-01");
    const sell = tx("SELL", "AAPL", 5, 110, "2025-03-01");
    expect(buy.createdAt).toBeLessThan(sell.createdAt);
    expect(findUpdateOversell([buy, sell], buy, { ...inputOf(buy), price: 101.5 })).toBeNull();
  });

  it("uses the edited values, not the stored ones, when checking a BUY", () => {
    const tx = makeFactory();
    const buy = tx("BUY", "AAPL", 10, 100, "2025-01-01");
    const sell = tx("SELL", "AAPL", 5, 120, "2025-02-01");
    expect(findUpdateOversell([buy, sell], buy, { ...inputOf(buy), date: "2025-03-01" })).toMatchObject({
      transactionId: sell.id,
      available: 0,
      requested: 5,
    });
  });

  it("reports the SELL left short in the old portfolio when a BUY moves to another portfolio", () => {
    const tx = makeFactory();
    const buy = tx("BUY", "TSLA", 5, 100, "2025-01-02", PORTFOLIO);
    const sell = tx("SELL", "TSLA", 2, 120, "2025-01-03", PORTFOLIO);
    expect(findUpdateOversell([buy, sell], buy, { ...inputOf(buy), portfolioId: OTHER_PORTFOLIO })).toEqual({
      ticker: "TSLA",
      date: "2025-01-03",
      transactionId: sell.id,
      available: 0,
      requested: 2,
    });
  });

  it("reports the old ticker's SELL when a BUY's ticker changes", () => {
    const tx = makeFactory();
    const buy = tx("BUY", "TSLA", 5, 100, "2025-01-02");
    const sell = tx("SELL", "TSLA", 2, 120, "2025-01-03");
    expect(findUpdateOversell([buy, sell], buy, { ...inputOf(buy), ticker: "TSLX" })).toMatchObject({
      ticker: "TSLA",
      transactionId: sell.id,
      available: 0,
    });
  });

  it("reports a moved SELL in its new portfolio before any violation left in the old one", () => {
    const tx = makeFactory();
    const brokenEarlier = tx("SELL", "AAPL", 1, 100, "2024-12-01", PORTFOLIO);
    const buy = tx("BUY", "AAPL", 5, 100, "2025-01-01", PORTFOLIO);
    const sell = tx("SELL", "AAPL", 3, 120, "2025-02-01", PORTFOLIO);
    const history = [brokenEarlier, buy, sell];
    expect(findUpdateOversell(history, sell, { ...inputOf(sell), portfolioId: OTHER_PORTFOLIO })).toEqual({
      ticker: "AAPL",
      date: "2025-02-01",
      transactionId: sell.id,
      available: 0,
      requested: 3,
    });
  });

  it("accepts an edit that fixes a pre-existing oversell", () => {
    const tx = makeFactory();
    const buy = tx("BUY", "AAPL", 5, 100, "2025-01-01");
    const sell = tx("SELL", "AAPL", 8, 120, "2025-02-01");
    expect(validateSellSequence([buy, sell]).ok).toBe(false);
    expect(findUpdateOversell([buy, sell], sell, { ...inputOf(sell), quantity: 5 })).toBeNull();
    expect(findUpdateOversell([buy, sell], buy, { ...inputOf(buy), quantity: 8 })).toBeNull();
  });

  it("still reports an invalid sale elsewhere in the edited position", () => {
    const tx = makeFactory();
    const buy = tx("BUY", "AAPL", 10, 100, "2025-01-01");
    const brokenSell = tx("SELL", "AAPL", 20, 120, "2025-03-01");
    expect(findUpdateOversell([buy, brokenSell], buy, { ...inputOf(buy), price: 99 })).toMatchObject({
      transactionId: brokenSell.id,
    });
  });

  it("ignores an invalid position with another ticker or in another portfolio", () => {
    const tx = makeFactory();
    const brokenTicker = tx("SELL", "MSFT", 3, 100, "2025-01-01", PORTFOLIO);
    const brokenPortfolio = tx("SELL", "AAPL", 3, 100, "2025-01-01", OTHER_PORTFOLIO);
    const buy = tx("BUY", "AAPL", 10, 100, "2025-01-02", PORTFOLIO);
    const history = [brokenTicker, brokenPortfolio, buy];
    expect(findUpdateOversell(history, buy, { ...inputOf(buy), quantity: 4 })).toBeNull();
  });
});

describe("findRemovalOversell", () => {
  it("never blocks removing a SELL, even from an invalid history", () => {
    const tx = makeFactory();
    const sell = tx("SELL", "AAPL", 5, 100, "2025-01-01");
    const laterSell = tx("SELL", "AAPL", 5, 100, "2025-02-01");
    expect(findRemovalOversell([sell, laterSell], sell)).toBeNull();
  });

  it("reports the SELL that a removed BUY was covering", () => {
    const tx = makeFactory();
    const buy = tx("BUY", "AAPL", 10, 100, "2025-01-01");
    const sell = tx("SELL", "AAPL", 4, 120, "2025-02-01");
    expect(findRemovalOversell([buy, sell], buy)).toEqual({
      ticker: "AAPL",
      date: "2025-02-01",
      transactionId: sell.id,
      available: 0,
      requested: 4,
    });
  });

  it("allows removing a BUY when other buys still cover the sales", () => {
    const tx = makeFactory();
    const buy = tx("BUY", "AAPL", 10, 100, "2025-01-01");
    const otherBuy = tx("BUY", "AAPL", 5, 100, "2025-01-15");
    const sell = tx("SELL", "AAPL", 4, 120, "2025-02-01");
    expect(findRemovalOversell([buy, otherBuy, sell], buy)).toBeNull();
  });

  it("does not count a same-ticker BUY held in another portfolio", () => {
    const tx = makeFactory();
    const buy = tx("BUY", "AAPL", 10, 100, "2025-01-01", PORTFOLIO);
    const sell = tx("SELL", "AAPL", 4, 120, "2025-02-01", PORTFOLIO);
    const otherBuy = tx("BUY", "AAPL", 10, 100, "2025-01-01", OTHER_PORTFOLIO);
    const history = [buy, sell, otherBuy];
    expect(findRemovalOversell(history, otherBuy)).toBeNull();
    expect(findRemovalOversell(history, buy)).toMatchObject({ transactionId: sell.id });
  });
});

// Deterministic PRNG (mulberry32), so every run replays the same random histories.
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// An independent model of the server checks: a plain share counter per position, no position engine.
const oracle = {
  compare(a: TransactionLike, b: TransactionLike): number {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  },

  replay(transactions: readonly TransactionLike[], portfolioId: string, ticker: string): OversellViolation | null {
    const position = transactions
      .filter((t) => t.portfolioId === portfolioId && t.ticker === ticker)
      .sort(oracle.compare);
    let shares = 0;
    for (const t of position) {
      if (t.type === "BUY") {
        shares += t.quantity;
        continue;
      }
      if (shares <= SHARES_EPSILON || t.quantity > shares + SHARES_EPSILON) {
        return { ticker: t.ticker, date: t.date, transactionId: t.id, available: shares, requested: t.quantity };
      }
      shares = shares - t.quantity <= SHARES_EPSILON ? 0 : shares - t.quantity;
    }
    return null;
  },

  // Patches the stored doc in place, like ctx.db.patch: id and createdAt survive.
  update(history: readonly TransactionLike[], original: TransactionLike, edited: TransactionInput) {
    const next = history.map((t) => (t.id === original.id ? { ...t, ...edited } : t));
    const moved = original.portfolioId !== edited.portfolioId || original.ticker !== edited.ticker;
    const inNewPosition = oracle.replay(next, edited.portfolioId, edited.ticker);
    if (inNewPosition) return { violation: inNewPosition, fromOldPosition: false };
    const inOldPosition = moved ? oracle.replay(next, original.portfolioId, original.ticker) : null;
    return { violation: inOldPosition, fromOldPosition: inOldPosition !== null };
  },

  remove(history: readonly TransactionLike[], target: TransactionLike): OversellViolation | null {
    if (target.type === "SELL") return null;
    return oracle.replay(
      history.filter((t) => t.id !== target.id),
      target.portfolioId,
      target.ticker,
    );
  },
};

describe("pre-checks match an independent oracle on random histories", () => {
  const PORTFOLIOS = [PORTFOLIO, OTHER_PORTFOLIO];
  const TICKERS = ["AAPL", "MSFT"];
  const DATES = ["2025-01-01", "2025-01-02", "2025-01-03", "2025-01-04"];
  // Includes 0.1 + 0.2 vs 0.3, so the SHARES_EPSILON tolerance is exercised.
  const QUANTITIES = [0.1, 0.2, 0.3, 0.5, 1, 2, 3, 5];
  const HISTORY_COUNT = 300;

  function pick<T>(random: () => number, values: readonly T[]): T {
    return values[Math.floor(random() * values.length)];
  }

  function randomInput(random: () => number): TransactionInput {
    return {
      portfolioId: pick(random, PORTFOLIOS),
      ticker: pick(random, TICKERS),
      type: random() < 0.6 ? "BUY" : "SELL",
      date: pick(random, DATES),
      quantity: pick(random, QUANTITIES),
      price: pick(random, [50, 100.25]),
    };
  }

  // Ids come from a shuffled sequence and createdAt collides often, so the id tiebreak matters.
  function randomHistory(random: () => number): TransactionLike[] {
    const count = 1 + Math.floor(random() * 12);
    const ids = Array.from({ length: count }, (_, index) => `t${String(index).padStart(2, "0")}`);
    for (let index = ids.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(random() * (index + 1));
      [ids[index], ids[swap]] = [ids[swap], ids[index]];
    }
    return ids.map((id) => {
      const input = randomInput(random);
      return {
        ...input,
        id,
        totalAmount: input.quantity * input.price,
        createdAt: 1 + Math.floor(random() * 3),
      };
    });
  }

  function randomEdit(random: () => number, original: TransactionLike): TransactionInput {
    const fresh = randomInput(random);
    const edited = inputOf(original);
    return {
      portfolioId: random() < 0.3 ? fresh.portfolioId : edited.portfolioId,
      ticker: random() < 0.3 ? fresh.ticker : edited.ticker,
      type: random() < 0.25 ? fresh.type : edited.type,
      date: random() < 0.4 ? fresh.date : edited.date,
      quantity: random() < 0.5 ? fresh.quantity : edited.quantity,
      price: random() < 0.2 ? fresh.price : edited.price,
    };
  }

  it("findUpdateOversell equals the oracle", () => {
    const random = seededRandom(9);
    const outcomes = { violations: 0, clean: 0, fromOldPosition: 0 };
    for (let run = 0; run < HISTORY_COUNT; run += 1) {
      const history = randomHistory(random);
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const original = pick(random, history);
        const edited = randomEdit(random, original);
        const expected = oracle.update(history, original, edited);
        expect(findUpdateOversell(history, original, edited), JSON.stringify({ history, original, edited })).toEqual(
          expected.violation,
        );
        if (expected.violation) outcomes.violations += 1;
        else outcomes.clean += 1;
        if (expected.fromOldPosition) outcomes.fromOldPosition += 1;
      }
    }
    // Guards the generator: both outcomes and the old-position branch must actually be exercised.
    expect(outcomes.violations).toBeGreaterThan(100);
    expect(outcomes.clean).toBeGreaterThan(100);
    expect(outcomes.fromOldPosition).toBeGreaterThan(10);
  });

  it("findRemovalOversell equals the oracle", () => {
    const random = seededRandom(17);
    const outcomes = { violations: 0, clean: 0 };
    for (let run = 0; run < HISTORY_COUNT; run += 1) {
      const history = randomHistory(random);
      for (const target of history) {
        const expected = oracle.remove(history, target);
        expect(findRemovalOversell(history, target), JSON.stringify({ history, target })).toEqual(expected);
        if (expected) outcomes.violations += 1;
        else outcomes.clean += 1;
      }
    }
    expect(outcomes.violations).toBeGreaterThan(100);
    expect(outcomes.clean).toBeGreaterThan(100);
  });
});
