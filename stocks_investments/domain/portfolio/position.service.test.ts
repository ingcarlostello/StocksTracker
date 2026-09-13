import { describe, expect, it } from "vitest";
import type { TransactionLike } from "../transactions/transaction.type";
import { applyTransaction, buildPositions, emptyPosition } from "./position.service";

let sequence = 0;
function buy(ticker: string, quantity: number, price: number, date = "2025-01-02"): TransactionLike {
  sequence += 1;
  return {
    id: `t${sequence}`,
    ticker,
    type: "BUY",
    date,
    quantity,
    price,
    totalAmount: quantity * price,
    createdAt: sequence,
  };
}

describe("applyTransaction", () => {
  it("adds shares and cost on a BUY", () => {
    const position = applyTransaction(emptyPosition("AAPL"), buy("AAPL", 1, 100));
    expect(position).toEqual({ ticker: "AAPL", shares: 1, costBasis: 100 });
  });

  it("does not mutate the input position", () => {
    const start = emptyPosition("AAPL");
    applyTransaction(start, buy("AAPL", 1, 100));
    expect(start).toEqual({ ticker: "AAPL", shares: 0, costBasis: 0 });
  });

  it("rejects a transaction for another ticker", () => {
    expect(() => applyTransaction(emptyPosition("AAPL"), buy("MSFT", 1, 100))).toThrow();
  });

  it("rejects SELL until sell logic exists", () => {
    const sell: TransactionLike = { ...buy("AAPL", 1, 100), type: "SELL" };
    expect(() => applyTransaction(emptyPosition("AAPL"), sell)).toThrow();
  });
});

describe("buildPositions", () => {
  it("spec example: BUY 1 @ 100 + BUY 1 @ 200 → 2 shares, 300 invested", () => {
    const [position] = buildPositions([buy("AAPL", 1, 100), buy("AAPL", 1, 200)]);
    expect(position).toEqual({ ticker: "AAPL", shares: 2, costBasis: 300 });
  });

  it("keeps each ticker separate and sorts positions by ticker", () => {
    const positions = buildPositions([
      buy("MSFT", 2, 50),
      buy("AAPL", 1, 100),
      buy("MSFT", 1, 80),
    ]);
    expect(positions).toEqual([
      { ticker: "AAPL", shares: 1, costBasis: 100 },
      { ticker: "MSFT", shares: 3, costBasis: 180 },
    ]);
  });

  it("gives the same result regardless of input order", () => {
    const transactions = [
      buy("AAPL", 1, 100, "2025-03-01"),
      buy("AAPL", 2, 150, "2025-01-01"),
      buy("BRK.B", 0.5, 400, "2025-02-01"),
    ];
    expect(buildPositions([...transactions].reverse())).toEqual(buildPositions(transactions));
  });

  it("supports fractional shares", () => {
    const [position] = buildPositions([buy("VOO", 0.25, 400), buy("VOO", 0.5, 420)]);
    expect(position.shares).toBeCloseTo(0.75, 12);
    expect(position.costBasis).toBeCloseTo(310, 10);
  });

  it("returns no positions for no transactions", () => {
    expect(buildPositions([])).toEqual([]);
  });
});
