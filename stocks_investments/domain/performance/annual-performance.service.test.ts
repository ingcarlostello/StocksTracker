import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PriceMap } from "../portfolio/portfolio.type";
import { positionsAt } from "../portfolio/position.service";
import type { TransactionLike, TransactionType } from "../transactions/transaction.type";
import { addDays, dayIndex, isoYearStart } from "../../utils/date.utils";
import { formatSignedPercent } from "../../utils/number-format.utils";
import { buildAnnualPerformance } from "./annual-performance.service";
import { cashFlowsInPeriod } from "./cash-flow.service";
import { flowWeight, modifiedDietz } from "./modified-dietz.service";
import type { AnnualPerformanceInput, BoundaryValuation } from "./performance.type";

// Delegates to the real formula; only the call count is observed (the early-January case must never
// reach it, because its zero-length period would throw).
vi.mock("./modified-dietz.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./modified-dietz.service")>();
  return { ...actual, modifiedDietz: vi.fn(actual.modifiedDietz) };
});

beforeEach(() => {
  vi.clearAllMocks();
});

function makeFactory() {
  let sequence = 0;
  return function tx(
    type: TransactionType,
    ticker: string,
    quantity: number,
    price: number,
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
      price,
      totalAmount: quantity * price,
      createdAt: sequence,
    };
  };
}

function closes(asOfDate: string, prices: PriceMap): BoundaryValuation {
  return { kind: "closes", asOfDate, prices };
}

function noPositions(date: string): BoundaryValuation {
  return { kind: "no-positions", date };
}

function unavailable(date: string): BoundaryValuation {
  return { kind: "unavailable", date };
}

describe("plan verification 1: the spec example", () => {
  const tx = makeFactory();
  const history = [
    tx("BUY", "AAPL", 50, 80, "2024-06-03"),
    tx("BUY", "AAPL", 100, 100, "2025-07-01"),
  ];
  const result = buildAnnualPerformance({
    transactions: history,
    year: 2025,
    kind: "past",
    begin: closes("2024-12-31", { AAPL: 100 }),
    end: closes("2025-12-31", { AAPL: 110 }),
  });

  it("values both boundaries from the positions held at each calendar year end", () => {
    expect(result.beginValue).toBe(5000);
    expect(result.endValue).toBe(16500);
    expect(result.beginValuationDate).toBe("2024-12-31");
    expect(result.endValuationDate).toBe("2025-12-31");
  });

  it("reports +$1,500.00 of investment performance on $10,000.00 contributed", () => {
    expect(result.contributions).toBe(10000);
    expect(result.withdrawals).toBe(0);
    expect(result.cashContributed).toBe(10000);
    expect(result.investmentPerformance).toBe(1500);
  });

  it("measures the whole calendar year at +14.94%", () => {
    expect(result.status).toBe("ok");
    expect(result.period.calendarDays).toBe(365);
    expect(result.period.isRebasedStart).toBe(false);
    expect(result.period.isClosedOut).toBe(false);
    expect(result.totalReturn).toBeCloseTo(0.14938608458390176, 12);
    expect(formatSignedPercent(result.totalReturn ?? 0)).toBe("+14.94%");
  });
});

describe("plan verification 2: nothing held on January 1", () => {
  const tx = makeFactory();
  const history = [tx("BUY", "AAPL", 100, 100, "2025-07-01")];
  const result = buildAnnualPerformance({
    transactions: history,
    year: 2025,
    kind: "past",
    begin: noPositions("2024-12-31"),
    end: closes("2025-12-31", { AAPL: 110 }),
  });

  it("measures from the first trade of the year instead of from January 1", () => {
    expect(result.period.start).toBe("2025-07-01");
    expect(result.period.calendarDays).toBe(184);
    expect(result.period.isRebasedStart).toBe(true);
    expect(result.beginValue).toBe(0);
    expect(result.totalReturn).toBe(0.1);
  });

  it("would report +19.84% over the untrimmed calendar year", () => {
    const untrimmed = modifiedDietz({
      beginValue: 0,
      endValue: 11000,
      flows: [{ date: "2025-07-01", amount: 10000 }],
      start: "2025-01-01",
      endExclusive: "2026-01-01",
    });
    expect(untrimmed.ok && untrimmed.rate).toBe(0.1983695652173913);
  });

  it("plan verification 3: does not annualise the partial year", () => {
    expect(formatSignedPercent(result.totalReturn ?? 0)).toBe("+10.00%");
  });

  it("does not depend on the order the history arrives in", () => {
    const ordered = makeFactory();
    const july = ordered("BUY", "AAPL", 100, 100, "2025-07-01");
    const september = ordered("BUY", "AAPL", 10, 120, "2025-09-01");
    const input = (transactions: TransactionLike[]): AnnualPerformanceInput => ({
      transactions,
      year: 2025,
      kind: "past",
      begin: noPositions("2024-12-31"),
      end: closes("2025-12-31", { AAPL: 110 }),
    });
    const shuffled = buildAnnualPerformance(input([september, july]));

    expect(shuffled).toEqual(buildAnnualPerformance(input([july, september])));
    expect(shuffled.period.start).toBe("2025-07-01");
  });
});

describe("plan verification 4: the combined view of two portfolios", () => {
  const tx = makeFactory();
  const retiro = [tx("BUY", "AAPL", 50, 80, "2024-06-03", "p-retiro")];
  const viajes = [tx("BUY", "AAPL", 100, 100, "2025-07-01", "p-viajes")];
  const year = { year: 2025, kind: "past" } as const;
  const end = closes("2025-12-31", { AAPL: 110 });

  const first = buildAnnualPerformance({
    ...year,
    transactions: retiro,
    begin: closes("2024-12-31", { AAPL: 100 }),
    end,
  });
  const second = buildAnnualPerformance({
    ...year,
    transactions: viajes,
    begin: noPositions("2024-12-31"),
    end,
  });
  const combined = buildAnnualPerformance({
    ...year,
    transactions: [...retiro, ...viajes],
    begin: closes("2024-12-31", { AAPL: 100 }),
    end,
  });

  it("gives each portfolio its own +10.00%", () => {
    expect(first.totalReturn).toBe(0.1);
    expect(second.totalReturn).toBe(0.1);
    expect(first.investmentPerformance).toBe(500);
    expect(second.investmentPerformance).toBe(1000);
  });

  it("adds up every dollar figure, but not the rate", () => {
    expect(combined.beginValue).toBe(5000);
    expect(combined.endValue).toBe(16500);
    expect(combined.cashContributed).toBe(10000);
    expect(combined.investmentPerformance).toBe(1500);
    expect(combined.investmentPerformance).toBe(
      (first.investmentPerformance ?? 0) + (second.investmentPerformance ?? 0),
    );
    expect(combined.totalReturn).toBeCloseTo(0.14938608458390176, 12);
  });
});

describe("the dev deployment's own history", () => {
  const tx = makeFactory();
  // 0.7692307692307693 × 130 is exactly 100 in float64, so Cash Contributed is exact to the cent.
  const history = [tx("BUY", "NVDA", 0.7692307692307693, 130, "2026-07-06", "pension")];
  const result = buildAnnualPerformance({
    transactions: history,
    year: 2026,
    kind: "current",
    begin: noPositions("2025-12-31"),
    end: closes("2026-09-14", { NVDA: 210.96 }),
  });

  it("measures the year in progress from the first trade", () => {
    expect(result.period).toEqual({
      start: "2026-07-06",
      endExclusive: "2026-09-15",
      lastDay: "2026-09-14",
      calendarDays: 71,
      isRebasedStart: true,
      isInProgress: true,
      isClosedOut: false,
    });
  });

  it("reports +62.28% on an exactly $100.00 contribution", () => {
    expect(result.beginValue).toBe(0);
    expect(result.cashContributed).toBe(100);
    expect(result.endValue).toBeCloseTo(162.27692307692308, 12);
    expect(result.investmentPerformance).toBeCloseTo(62.27692307692308, 12);
    expect(result.totalReturn).toBeCloseTo(0.6227692307692309, 12);
    expect(formatSignedPercent(result.totalReturn ?? 0)).toBe("+62.28%");
    expect(result.status).toBe("ok");
  });
});

describe("conservation: performance equals realized plus unrealized change", () => {
  const tx = makeFactory();
  const history = [
    tx("BUY", "AAPL", 100, 80, "2024-06-03"),
    tx("SELL", "AAPL", 50, 120, "2025-04-01"),
    tx("BUY", "AAPL", 10, 130, "2025-10-01"),
  ];
  const result = buildAnnualPerformance({
    transactions: history,
    year: 2025,
    kind: "past",
    begin: closes("2024-12-31", { AAPL: 100 }),
    end: closes("2025-12-31", { AAPL: 125 }),
  });

  it("reports a negative Cash Contributed for a net seller", () => {
    expect(result.contributions).toBe(1300);
    expect(result.withdrawals).toBe(6000);
    expect(result.cashContributed).toBe(-4700);
  });

  it("splits into the realized and unrealized change of the year", () => {
    const [begin] = positionsAt(history, "2024-12-31");
    const [end] = positionsAt(history, "2025-12-31");
    const realizedChange = end.realizedGain - begin.realizedGain;
    const unrealizedChange =
      (result.endValue ?? 0) - end.costBasis - ((result.beginValue ?? 0) - begin.costBasis);

    expect(realizedChange).toBe(2000);
    expect(unrealizedChange).toBeCloseTo(200, 9);
    expect(result.investmentPerformance).toBeCloseTo(realizedChange + unrealizedChange, 9);
    expect(result.investmentPerformance).toBe(2200);
  });

  it("weights the withdrawal and the late buy at +37.88%", () => {
    expect(result.endValue).toBe(7500);
    expect(result.averageCapital).toBe(5807.123287671233);
    expect(result.totalReturn).toBeCloseTo(0.3788450651066239, 12);
    expect(formatSignedPercent(result.totalReturn ?? 0)).toBe("+37.88%");
  });
});

describe("a year end on a weekend", () => {
  const tx = makeFactory();
  // 2022-12-31 is a Saturday, so the year's closes come from 2022-12-30.
  const history = [
    tx("BUY", "X", 10, 100, "2022-06-01"),
    tx("BUY", "X", 5, 90, "2022-12-31"),
  ];
  const yearEndCloses = closes("2022-12-30", { X: 95 });
  const ending = buildAnnualPerformance({
    transactions: history,
    year: 2022,
    kind: "past",
    begin: noPositions("2021-12-31"),
    end: yearEndCloses,
  });
  const starting = buildAnnualPerformance({
    transactions: history,
    year: 2023,
    kind: "past",
    begin: yearEndCloses,
    end: closes("2023-12-29", { X: 100 }),
  });

  it("counts a Dec 31 trade as a flow of that year", () => {
    expect(ending.contributions).toBe(1450);
    expect(starting.contributions).toBe(0);
  });

  it("makes one year's ending value the next year's starting value", () => {
    expect(ending.endValue).toBe(1425);
    expect(starting.beginValue).toBe(1425);
  });
});

describe("a trade dated on a non-trading year end", () => {
  const tx = makeFactory();
  const history = [tx("BUY", "X", 10, 100, "2022-12-31")];
  const yearEndCloses = closes("2022-12-30", { X: 95 });
  const ending = buildAnnualPerformance({
    transactions: history,
    year: 2022,
    kind: "past",
    begin: noPositions("2021-12-31"),
    end: yearEndCloses,
  });
  const starting = buildAnnualPerformance({
    transactions: history,
    year: 2023,
    kind: "past",
    begin: yearEndCloses,
    end: closes("2023-12-29", { X: 100 }),
  });

  it("books (close − price) × quantity in the year of the trade", () => {
    // Counting positions at the calendar boundary values a Saturday-dated buy at Friday's close, so
    // -$50.00 is booked in 2022 although the position was held for zero trading days.
    expect(ending.cashContributed).toBe(1000);
    expect(ending.endValue).toBe(950);
    expect(ending.investmentPerformance).toBe(-50);
    expect(ending.investmentPerformance).toBe((95 - 100) * 10);
  });

  it("keeps the two years joined at the same value", () => {
    expect(ending.endValue).toBe(950);
    expect(starting.beginValue).toBe(950);
  });
});

describe("a past year that was closed out", () => {
  const tx = makeFactory();
  const history = [
    tx("BUY", "X", 50, 100, "2024-03-01"),
    tx("SELL", "X", 50, 110, "2025-03-01"),
  ];
  const result = buildAnnualPerformance({
    transactions: history,
    year: 2025,
    kind: "past",
    begin: closes("2024-12-31", { X: 100 }),
    end: noPositions("2025-12-31"),
  });

  it("ends the period at the last trade instead of at December 31", () => {
    expect(result.period).toEqual({
      start: "2025-01-01",
      endExclusive: "2025-03-02",
      lastDay: "2025-03-01",
      calendarDays: 60,
      isRebasedStart: false,
      isInProgress: false,
      isClosedOut: true,
    });
  });

  it("reports +10.19% over the span in which capital was invested", () => {
    expect(result.averageCapital).toBe(4908.333333333333);
    expect(result.totalReturn).toBeCloseTo(0.10186757215619695, 12);
    expect(formatSignedPercent(result.totalReturn ?? 0)).toBe("+10.19%");
  });

  it("would report +128.52% over the full calendar year, on the same dollars", () => {
    const calendarYear = modifiedDietz({
      beginValue: 5000,
      endValue: 0,
      flows: [{ date: "2025-03-01", amount: -5500 }],
      start: "2025-01-01",
      endExclusive: "2026-01-01",
    });
    expect(calendarYear.averageCapital).toBe(389.04109589041127);
    expect(calendarYear.ok && calendarYear.rate).toBeCloseTo(1.2852112676056329, 12);
    // Trimming the period moves the rate only: every dollar figure is the same either way.
    expect(result.beginValue).toBe(5000);
    expect(result.endValue).toBe(0);
    expect(result.cashContributed).toBe(-5500);
    expect(result.investmentPerformance).toBe(500);
  });
});

describe("a current year opened and closed inside the year", () => {
  const tx = makeFactory();
  const history = [
    tx("BUY", "Y", 10, 100, "2026-02-02"),
    tx("SELL", "Y", 10, 110, "2026-03-02"),
  ];

  function at(asOfDate: string) {
    return buildAnnualPerformance({
      transactions: history,
      year: 2026,
      kind: "current",
      begin: noPositions("2025-12-31"),
      end: noPositions(asOfDate),
    });
  }

  const result = at("2026-09-14");

  it("measures from the first trade to the last one", () => {
    expect(result.period).toEqual({
      start: "2026-02-02",
      endExclusive: "2026-03-03",
      lastDay: "2026-03-02",
      calendarDays: 29,
      isRebasedStart: true,
      isInProgress: true,
      isClosedOut: true,
    });
    expect(result.beginValue).toBe(0);
    expect(result.endValue).toBe(0);
    expect(result.cashContributed).toBe(-100);
    expect(result.investmentPerformance).toBe(100);
    expect(result.averageCapital).toBe(962.0689655172414);
    expect(result.totalReturn).toBeCloseTo(0.1039426523297491, 12);
    expect(formatSignedPercent(result.totalReturn ?? 0)).toBe("+10.39%");
  });

  it("reports the same year whichever date the valuation fell back to", () => {
    // Untrimmed, the fallback date reached the rate: +271.08% at 2026-09-14 and +258.14% at 2026-09-11.
    expect(at("2026-09-11")).toEqual(result);
  });
});

describe("the trimmed period is never empty or inverted", () => {
  const tx = makeFactory();
  const cases: { name: string; input: AnnualPerformanceInput; rawEndExclusive: string }[] = [
    {
      name: "closed-out past year",
      input: {
        transactions: [tx("BUY", "X", 50, 100, "2024-03-01"), tx("SELL", "X", 50, 110, "2025-03-01")],
        year: 2025,
        kind: "past",
        begin: closes("2024-12-31", { X: 100 }),
        end: noPositions("2025-12-31"),
      },
      rawEndExclusive: "2026-01-01",
    },
    {
      name: "opened and closed inside the current year",
      input: {
        transactions: [tx("BUY", "Y", 10, 100, "2026-02-02"), tx("SELL", "Y", 10, 110, "2026-03-02")],
        year: 2026,
        kind: "current",
        begin: noPositions("2025-12-31"),
        end: noPositions("2026-09-14"),
      },
      rawEndExclusive: "2026-09-15",
    },
    {
      name: "sold for more than the capital invested",
      input: {
        transactions: [tx("BUY", "Z", 10, 100, "2024-02-02"), tx("SELL", "Z", 10, 300, "2025-01-02")],
        year: 2025,
        kind: "past",
        begin: closes("2024-12-31", { Z: 100 }),
        end: noPositions("2025-12-31"),
      },
      rawEndExclusive: "2026-01-01",
    },
    {
      name: "a single flow, which is also the last one",
      input: {
        transactions: [tx("BUY", "W", 10, 50, "2024-02-02"), tx("SELL", "W", 10, 60, "2025-05-05")],
        year: 2025,
        kind: "past",
        begin: closes("2024-12-31", { W: 55 }),
        end: noPositions("2025-12-31"),
      },
      rawEndExclusive: "2026-01-01",
    },
  ];

  it.each(cases)("$name", ({ input, rawEndExclusive }) => {
    const { period } = buildAnnualPerformance(input);
    expect(period.isClosedOut).toBe(true);
    expect(period.calendarDays).toBeGreaterThanOrEqual(1);
    expect(dayIndex(period.endExclusive)).toBeGreaterThan(dayIndex(period.start));
    expect(dayIndex(period.endExclusive)).toBeLessThanOrEqual(dayIndex(rawEndExclusive));

    const flows = cashFlowsInPeriod(input.transactions, isoYearStart(input.year), rawEndExclusive);
    for (const flow of flows) {
      expect(flow.date >= period.start).toBe(true);
      expect(flow.date < period.endExclusive).toBe(true);
    }
    // Every flow is inside the trimmed period, so the formula's own guard can never fire.
    expect(() =>
      modifiedDietz({
        beginValue: 1,
        endValue: 1,
        flows,
        start: period.start,
        endExclusive: period.endExclusive,
      }),
    ).not.toThrow();
  });
});

describe("a year with holdings but no trades", () => {
  const tx = makeFactory();
  const result = buildAnnualPerformance({
    transactions: [tx("BUY", "X", 50, 100, "2024-03-01")],
    year: 2025,
    kind: "past",
    begin: closes("2024-12-31", { X: 100 }),
    end: closes("2025-12-31", { X: 110 }),
  });

  it("measures the plain change in value", () => {
    expect(result.status).toBe("ok");
    expect(result.cashContributed).toBe(0);
    expect(result.investmentPerformance).toBe(500);
    expect(result.totalReturn).toBe(0.1);
  });
});

describe("no activity", () => {
  const tx = makeFactory();
  const result = buildAnnualPerformance({
    transactions: [tx("BUY", "X", 5, 100, "2023-02-02"), tx("SELL", "X", 5, 120, "2023-06-02")],
    year: 2025,
    kind: "past",
    begin: noPositions("2024-12-31"),
    end: noPositions("2025-12-31"),
  });

  it("reports zeros and no rate at all", () => {
    expect(result.status).toBe("no-activity");
    expect(result.beginValue).toBe(0);
    expect(result.endValue).toBe(0);
    expect(result.cashContributed).toBe(0);
    expect(result.investmentPerformance).toBe(0);
    expect(result.totalReturn).toBeNull();
    expect(result.averageCapital).toBeNull();
    expect(result.excludedFlows).toEqual({ count: 0, firstDate: null, net: 0 });
  });
});

describe("awaiting the first close of the year", () => {
  it("has nothing to measure while the latest close is still in the previous year", () => {
    const tx = makeFactory();
    const result = buildAnnualPerformance({
      transactions: [tx("BUY", "A", 5, 100, "2027-01-02")],
      year: 2027,
      kind: "current",
      begin: noPositions("2026-12-31"),
      end: closes("2026-12-31", { A: 90 }),
    });

    expect(result.status).toBe("awaiting-first-close");
    expect(result.period).toEqual({
      start: "2027-01-01",
      endExclusive: "2027-01-01",
      lastDay: null,
      calendarDays: 0,
      isRebasedStart: false,
      isInProgress: true,
      isClosedOut: false,
    });
    expect(result.endValue).toBeNull();
    expect(result.totalReturn).toBeNull();
    expect(result.cashContributed).toBe(0);
    expect(result.excludedFlows).toEqual({ count: 1, firstDate: "2027-01-02", net: 500 });
    expect(vi.mocked(modifiedDietz)).not.toHaveBeenCalled();
  });

  it("keeps the calendar period when every trade of the year is after the valuation date", () => {
    const tx = makeFactory();
    const result = buildAnnualPerformance({
      transactions: [
        tx("BUY", "A", 10, 100, "2026-09-15"),
        tx("BUY", "B", 5, 200, "2026-09-16"),
      ],
      year: 2026,
      kind: "current",
      begin: noPositions("2025-12-31"),
      end: closes("2026-09-14", { A: 95, B: 190 }),
    });

    // Nothing is held at the valuation date, but the year has no flows either, so the period is not
    // trimmed: a closed-out re-base can never swallow this case.
    expect(result.status).toBe("awaiting-first-close");
    expect(result.period.isClosedOut).toBe(false);
    expect(result.period.start).toBe("2026-01-01");
    expect(result.period.endExclusive).toBe("2026-09-15");
    expect(result.period.isRebasedStart).toBe(false);
    expect(result.totalReturn).toBeNull();
    expect(result.cashContributed).toBe(0);
    expect(result.excludedFlows).toEqual({ count: 2, firstDate: "2026-09-15", net: 2000 });
  });
});

describe("a boundary close that is missing or unavailable", () => {
  const tx = makeFactory();
  const history = [
    tx("BUY", "X", 10, 100, "2024-01-02"),
    tx("BUY", "Y", 5, 50, "2025-06-01"),
  ];
  const year = { transactions: history, year: 2025, kind: "past" } as const;

  it("withholds the ending value and names the ticker", () => {
    const result = buildAnnualPerformance({
      ...year,
      begin: closes("2024-12-31", { X: 100 }),
      end: closes("2025-12-31", { X: 110 }),
    });
    expect(result.status).toBe("missing-end-price");
    expect(result.beginValue).toBe(1000);
    expect(result.endValue).toBeNull();
    expect(result.missingEndTickers).toEqual(["Y"]);
    expect(result.investmentPerformance).toBeNull();
    expect(result.totalReturn).toBeNull();
    expect(result.cashContributed).toBe(250);
  });

  it("reports the begin boundary first but lists both sets of tickers", () => {
    const result = buildAnnualPerformance({
      ...year,
      begin: closes("2024-12-31", {}),
      end: closes("2025-12-31", { X: 110 }),
    });
    expect(result.status).toBe("missing-begin-price");
    expect(result.missingBeginTickers).toEqual(["X"]);
    expect(result.missingEndTickers).toEqual(["Y"]);
    expect(result.beginValue).toBeNull();
    expect(result.endValue).toBeNull();
  });

  it("marks a boundary outside the provider's history as unavailable", () => {
    const result = buildAnnualPerformance({
      ...year,
      begin: unavailable("2024-12-31"),
      end: closes("2025-12-31", { X: 110, Y: 55 }),
    });
    expect(result.status).toBe("missing-begin-price");
    expect(result.beginUnavailable).toBe(true);
    expect(result.beginValue).toBeNull();
    expect(result.missingBeginTickers).toEqual([]);
    expect(result.beginValuationDate).toBeNull();
    expect(result.endValue).toBe(1375);
    // Cash Contributed never depends on a close.
    expect(result.cashContributed).toBe(250);
  });

  it("marks an unavailable ending boundary the same way", () => {
    const result = buildAnnualPerformance({
      ...year,
      begin: closes("2024-12-31", { X: 100 }),
      end: unavailable("2025-12-31"),
    });
    expect(result.status).toBe("missing-end-price");
    expect(result.endUnavailable).toBe(true);
    expect(result.endValue).toBeNull();
    expect(result.beginValue).toBe(1000);
  });
});

describe("a sale larger than the capital that was invested", () => {
  const tx = makeFactory();
  const result = buildAnnualPerformance({
    transactions: [tx("BUY", "Z", 10, 100, "2024-02-02"), tx("SELL", "Z", 10, 300, "2025-01-02")],
    year: 2025,
    kind: "past",
    begin: closes("2024-12-31", { Z: 100 }),
    end: noPositions("2025-12-31"),
  });

  it("has no positive base to measure against, however the period is trimmed", () => {
    expect(result.period).toEqual({
      start: "2025-01-01",
      endExclusive: "2025-01-03",
      lastDay: "2025-01-02",
      calendarDays: 2,
      isRebasedStart: false,
      isInProgress: false,
      isClosedOut: true,
    });
    expect(flowWeight("2025-01-02", "2025-01-01", 2)).toBe(0.5);
    expect(result.averageCapital).toBe(-500);
    expect(result.status).toBe("undefined-average-capital");
    expect(result.totalReturn).toBeNull();
  });

  it("keeps every dollar figure exact", () => {
    expect(result.beginValue).toBe(1000);
    expect(result.endValue).toBe(0);
    expect(result.cashContributed).toBe(-3000);
    expect(result.investmentPerformance).toBe(2000);
  });
});

describe("trades dated after the valuation date", () => {
  const tx = makeFactory();
  const result = buildAnnualPerformance({
    transactions: [
      tx("BUY", "X", 10, 100, "2026-02-02"),
      tx("BUY", "X", 5, 120, "2026-09-15"),
    ],
    year: 2026,
    kind: "current",
    begin: noPositions("2025-12-31"),
    end: closes("2026-09-14", { X: 130 }),
  });

  it("leaves them out of the measured period and reports them separately", () => {
    expect(result.excludedFlows).toEqual({ count: 1, firstDate: "2026-09-15", net: 600 });
    expect(result.cashContributed).toBe(1000);
    // The later buy is not part of the ending value either.
    expect(result.endValue).toBe(1300);
    expect(result.period.endExclusive).toBe("2026-09-15");
    expect(result.status).toBe("ok");
  });

  it("puts a trade dated on the valuation date inside the period", () => {
    const sameDay = makeFactory();
    const result = buildAnnualPerformance({
      transactions: [sameDay("BUY", "X", 10, 100, "2026-09-14")],
      year: 2026,
      kind: "current",
      begin: noPositions("2025-12-31"),
      end: closes("2026-09-14", { X: 130 }),
    });
    expect(result.excludedFlows.count).toBe(0);
    expect(result.cashContributed).toBe(1000);
    expect(result.period).toMatchObject({
      start: "2026-09-14",
      endExclusive: "2026-09-15",
      calendarDays: 1,
    });
    expect(addDays(result.period.endExclusive, -1)).toBe(result.period.lastDay);
  });
});
