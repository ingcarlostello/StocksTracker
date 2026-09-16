import { describe, expect, it } from "vitest";
import type { TransactionLike, TransactionType } from "../transactions/transaction.type";
import {
  cashFlowsInPeriod,
  flowsAfter,
  summarizeCashFlows,
  toCashFlow,
} from "./cash-flow.service";

function makeFactory() {
  let sequence = 0;
  return function tx(
    type: TransactionType,
    quantity: number,
    price: number,
    date: string,
    ticker = "AAPL",
  ): TransactionLike {
    sequence += 1;
    return {
      id: `t${String(sequence).padStart(2, "0")}`,
      portfolioId: "p-retiro",
      ticker,
      type,
      date,
      quantity,
      price,
      totalAmount: quantity * price,
      createdAt: sequence,
    };
  };
}

describe("toCashFlow", () => {
  it("makes a BUY a contribution and a SELL a withdrawal", () => {
    expect(toCashFlow({ type: "BUY", date: "2025-03-01", totalAmount: 1200 })).toEqual({
      date: "2025-03-01",
      amount: 1200,
    });
    expect(toCashFlow({ type: "SELL", date: "2025-03-01", totalAmount: 1200 })).toEqual({
      date: "2025-03-01",
      amount: -1200,
    });
  });

  it("uses the stored totalAmount, not quantity × price", () => {
    const tx = makeFactory();
    const stored = { ...tx("BUY", 3, 100, "2025-03-01"), totalAmount: 299.99 };
    expect(toCashFlow(stored).amount).toBe(299.99);
  });
});

describe("cashFlowsInPeriod", () => {
  const tx = makeFactory();
  const onStart = tx("BUY", 1, 100, "2025-01-01");
  const inside = tx("SELL", 1, 150, "2025-06-15");
  const onEnd = tx("BUY", 1, 200, "2026-01-01");
  const before = tx("BUY", 1, 90, "2024-12-31");
  const history = [onStart, inside, onEnd, before];

  it("includes the start date and excludes the end date", () => {
    expect(cashFlowsInPeriod(history, "2025-01-01", "2026-01-01")).toEqual([
      { date: "2025-01-01", amount: 100 },
      { date: "2025-06-15", amount: -150 },
    ]);
  });

  it("returns no flows for a period with no trades", () => {
    expect(cashFlowsInPeriod(history, "2023-01-01", "2024-01-01")).toEqual([]);
  });

  it("returns canonical order whatever order the caller passes", () => {
    const ordered = makeFactory();
    const january = ordered("BUY", 10, 100, "2025-01-10");
    const marchFirst = ordered("BUY", 1, 100, "2025-03-05");
    // Same date as marchFirst: canonical order comes from createdAt, not from input order.
    const marchSecond = ordered("SELL", 2, 120, "2025-03-05");
    const july = ordered("BUY", 3, 130, "2025-07-01");
    const shuffled = [july, marchSecond, january, marchFirst];

    const flows = cashFlowsInPeriod(shuffled, "2025-01-01", "2026-01-01");
    expect(flows).toEqual(cashFlowsInPeriod([january, marchFirst, marchSecond, july], "2025-01-01", "2026-01-01"));
    expect(flows.map((flow) => flow.amount)).toEqual([1000, 100, -240, 390]);
    expect(flows[0].date).toBe("2025-01-10");
  });
});

describe("summarizeCashFlows", () => {
  it("splits contributions from withdrawals and nets them", () => {
    expect(
      summarizeCashFlows([
        { date: "2025-02-01", amount: 12000 },
        { date: "2025-09-01", amount: -2000 },
      ]),
    ).toEqual({ contributions: 12000, withdrawals: 2000, net: 10000 });
  });

  it("reports a net seller with a negative net", () => {
    expect(
      summarizeCashFlows([
        { date: "2025-04-01", amount: -6000 },
        { date: "2025-10-01", amount: 1300 },
      ]),
    ).toEqual({ contributions: 1300, withdrawals: 6000, net: -4700 });
  });

  it("is all zeros for no flows", () => {
    expect(summarizeCashFlows([])).toEqual({ contributions: 0, withdrawals: 0, net: 0 });
  });
});

describe("flowsAfter", () => {
  const tx = makeFactory();
  const withinYear = tx("BUY", 1, 100, "2026-06-01");
  const afterValuation = tx("BUY", 10, 300, "2026-09-15");
  const alsoAfter = tx("SELL", 1, 200, "2026-10-01");
  const nextYear = tx("BUY", 1, 100, "2027-01-02");
  const history = [withinYear, afterValuation, alsoAfter, nextYear];

  it("counts the trades between the cut-off and the end of the year", () => {
    expect(flowsAfter(history, "2026-09-15", "2026-12-31")).toEqual({
      count: 2,
      firstDate: "2026-09-15",
      net: 3000 - 200,
    });
  });

  it("never leaves the selected year", () => {
    expect(flowsAfter(history, "2026-09-15", "2026-12-31").count).toBe(2);
    expect(flowsAfter(history, "2027-01-01", "2027-12-31")).toEqual({
      count: 1,
      firstDate: "2027-01-02",
      net: 100,
    });
  });

  it("is empty when nothing lies after the cut-off", () => {
    expect(flowsAfter(history, "2026-01-01", "2025-12-31")).toEqual({
      count: 0,
      firstDate: null,
      net: 0,
    });
  });

  it("reports the earliest date whatever order the caller passes", () => {
    const shuffled = [nextYear, alsoAfter, withinYear, afterValuation];
    expect(flowsAfter(shuffled, "2026-09-15", "2026-12-31").firstDate).toBe("2026-09-15");
  });
});
