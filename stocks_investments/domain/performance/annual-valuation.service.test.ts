import { describe, expect, it } from "vitest";
import {
  candidateTradingDates,
  possibleValuationDates,
} from "../market-data/trading-date.service";
import type { TransactionLike, TransactionType } from "../transactions/transaction.type";
import { addDays, isoDateFromDayIndex, dayIndex, weekdayOf } from "../../utils/date.utils";
import { performanceYears, planAnnualValuation } from "./annual-valuation.service";

const TODAY = "2026-09-15";

function makeFactory() {
  let sequence = 0;
  return function tx(
    type: TransactionType,
    ticker: string,
    quantity: number,
    date: string,
    portfolioId = "p-retiro",
  ): TransactionLike {
    sequence += 1;
    return {
      id: `t${String(sequence).padStart(2, "0")}`,
      portfolioId,
      ticker,
      type,
      date,
      quantity,
      price: 100,
      totalAmount: quantity * 100,
      createdAt: sequence,
    };
  };
}

describe("performanceYears", () => {
  it("runs from the current year down to the earliest trade, keeping years with no trades", () => {
    const tx = makeFactory();
    expect(
      performanceYears([tx("BUY", "AAPL", 1, "2024-06-03"), tx("BUY", "AAPL", 1, "2026-02-02")], 2026),
    ).toEqual([2026, 2025, 2024]);
  });

  it("offers no year at all without transactions", () => {
    expect(performanceYears([], 2026)).toEqual([]);
  });

  it("clamps a future-dated trade to the current year", () => {
    const tx = makeFactory();
    expect(performanceYears([tx("BUY", "AAPL", 1, "2027-03-01")], 2026)).toEqual([2026]);
  });
});

describe("planAnnualValuation for a past year", () => {
  const tx = makeFactory();
  const history = [
    tx("BUY", "AAPL", 10, "2024-12-02"),
    tx("BUY", "MSFT", 5, "2025-07-01"),
    tx("SELL", "AAPL", 4, "2025-09-10"),
  ];
  const plan = planAnnualValuation(history, 2025, TODAY);

  it("values both calendar boundaries with year-end closes", () => {
    expect(plan).toEqual({
      year: 2025,
      kind: "past",
      positionsBeginDate: "2024-12-31",
      positionsEndDate: "2025-12-31",
      begin: { kind: "year-end-closes", year: 2024, symbols: ["AAPL"] },
      end: { kind: "year-end-closes", year: 2025, symbols: ["AAPL", "MSFT"] },
    });
  });
});

describe("planAnnualValuation for the current year", () => {
  const tx = makeFactory();
  // Candidate valuation dates for 2026-09-15: 09-15, 09-14, 09-11, 09-10, 09-09.
  const history = [
    tx("BUY", "AAPL", 1, "2026-09-15"),
    tx("BUY", "MSFT", 2, "2026-01-05"),
    tx("SELL", "MSFT", 2, "2026-09-15"),
    tx("BUY", "NVDA", 3, "2026-02-02"),
    tx("SELL", "NVDA", 3, "2026-09-10"),
    tx("BUY", "TSLA", 4, "2026-01-07"),
    tx("SELL", "TSLA", 4, "2026-08-21"),
  ];
  const plan = planAnnualValuation(history, 2026, TODAY);

  it("asks for every ticker the answer's date could still hold", () => {
    expect(plan.kind).toBe("current");
    expect(plan.positionsEndDate).toBeNull();
    // AAPL was bought today, MSFT sold today, NVDA sold three weekdays ago; TSLA closed three weeks ago.
    expect(plan.end).toEqual({
      kind: "current-closes",
      symbols: ["AAPL", "MSFT", "NVDA"],
      fallbackDate: "2026-09-14",
    });
  });

  it("values the start of the year at the previous year's close", () => {
    expect(plan.positionsBeginDate).toBe("2025-12-31");
    expect(plan.begin).toEqual({ kind: "no-positions", date: "2025-12-31" });
  });

  it("asks for no price at all when nothing was held on any candidate date", () => {
    const closed = makeFactory();
    const plan = planAnnualValuation(
      [closed("BUY", "AAPL", 5, "2026-06-01"), closed("SELL", "AAPL", 5, "2026-06-20")],
      2026,
      TODAY,
    );
    expect(plan.end).toEqual({ kind: "no-positions", date: "2026-09-14" });
  });
});

describe("planAnnualValuation boundaries with dust", () => {
  it("does not make a settled sub-epsilon position a begin ticker", () => {
    const tx = makeFactory();
    // Neither 6e-10 position is open, and they must not add up to one across portfolios either.
    const plan = planAnnualValuation(
      [
        tx("BUY", "AAPL", 6e-10, "2024-05-02", "p-retiro"),
        tx("BUY", "AAPL", 6e-10, "2024-05-02", "p-viajes"),
      ],
      2025,
      TODAY,
    );
    expect(plan.begin).toEqual({ kind: "no-positions", date: "2024-12-31" });
  });
});

describe("possibleValuationDates covers every date the server can answer with", () => {
  it("contains the server's own candidates for a day of clock skew either way", () => {
    const firstOf2026 = dayIndex("2026-01-01");
    let weekdaysChecked = 0;

    for (let index = firstOf2026; index < dayIndex("2027-01-01"); index += 1) {
      const today = isoDateFromDayIndex(index);
      if (weekdayOf(today) === 0 || weekdayOf(today) === 6) continue;
      weekdaysChecked += 1;
      const covered = possibleValuationDates(today);
      for (const skew of [-1, 0, 1]) {
        for (const date of candidateTradingDates(addDays(today, skew))) {
          expect(covered, `${today} with server day ${addDays(today, skew)}`).toContain(date);
        }
      }
    }

    expect(weekdaysChecked).toBe(261);
  });
});
