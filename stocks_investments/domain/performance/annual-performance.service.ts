import { openPositions, valuePositions } from "../portfolio/portfolio.service";
import type { Position, PositionsValuation } from "../portfolio/portfolio.type";
import { positionsAt } from "../portfolio/position.service";
import { addDays, dayIndex, isoYearEnd, isoYearStart } from "../../utils/date.utils";
import { cashFlowsInPeriod, flowsAfter, summarizeCashFlows } from "./cash-flow.service";
import { modifiedDietz } from "./modified-dietz.service";
import type {
  AnnualPerformance,
  AnnualPerformanceInput,
  AnnualPerformanceStatus,
  BoundaryValuation,
  CashFlow,
  ExcludedFlows,
  ModifiedDietzResult,
  PerformancePeriod,
} from "./performance.type";

// The date whose closes value a boundary: the one the response carried, or the one that stood in for it.
function boundaryDate(boundary: BoundaryValuation): string {
  return boundary.kind === "closes" ? boundary.asOfDate : boundary.date;
}

// Nothing held is worth 0 whatever the boundary resolved to; an unavailable boundary cannot be valued.
function valueBoundary(
  positions: readonly Position[],
  boundary: BoundaryValuation,
): PositionsValuation {
  if (positions.length === 0) return { value: 0, missingTickers: [] };
  if (boundary.kind !== "closes") return { value: null, missingTickers: [] };
  return valuePositions(positions, boundary.prices);
}

type PeriodInput = {
  yearStart: string;
  rawEndExclusive: string;
  flows: readonly CashFlow[];
  hasBeginPositions: boolean;
  isClosedOut: boolean;
  isInProgress: boolean;
};

// The span in which capital was actually invested: it starts at the first flow when nothing was held on
// Jan 1, and stops at the last flow when nothing is held at the valuation date. Both re-bases can apply to
// the same year. flows are in canonical order, so flows[0] is the earliest and the last one the latest;
// each re-base therefore lands on a date that is inside [start, endExclusive) and the period is never
// empty or inverted, which is what keeps modifiedDietz away from its RangeError.
function annualPeriod(input: PeriodInput): PerformancePeriod {
  const { yearStart, rawEndExclusive, flows, hasBeginPositions, isClosedOut, isInProgress } = input;
  const isRebasedStart = !hasBeginPositions && flows.length > 0;
  const start = isRebasedStart ? flows[0].date : yearStart;
  const endExclusive = isClosedOut ? addDays(flows[flows.length - 1].date, 1) : rawEndExclusive;

  return {
    start,
    endExclusive,
    lastDay: addDays(endExclusive, -1),
    calendarDays: dayIndex(endExclusive) - dayIndex(start),
    isRebasedStart,
    isInProgress,
    isClosedOut,
  };
}

type StatusInput = {
  nothingMeasurable: boolean;
  excludedFlows: ExcludedFlows;
  beginValue: number | null;
  endValue: number | null;
  dietz: ModifiedDietzResult | null;
};

// First match wins. A year with no starting holdings and no flows has nothing to measure: it is either
// waiting for the close that will bring its trades in, or genuinely idle.
function annualStatus(input: StatusInput): AnnualPerformanceStatus {
  const { nothingMeasurable, excludedFlows, beginValue, endValue, dietz } = input;

  if (nothingMeasurable) {
    return excludedFlows.count > 0 ? "awaiting-first-close" : "no-activity";
  }
  if (beginValue === null) return "missing-begin-price";
  if (endValue === null) return "missing-end-price";
  if (dietz !== null && !dietz.ok) return "undefined-average-capital";
  return "ok";
}

export function buildAnnualPerformance(input: AnnualPerformanceInput): AnnualPerformance {
  const { transactions, year, kind, begin, end } = input;
  const yearStart = isoYearStart(year);
  const yearEnd = isoYearEnd(year);

  // Positions are counted at the calendar boundary and valued at the nearest published close, so a year's
  // ending value equals the next year's starting value even when Dec 31 falls on a weekend.
  const positionsBeginDate = isoYearEnd(year - 1);
  const positionsEndDate = kind === "past" ? yearEnd : boundaryDate(end);

  const beginOpen = openPositions(positionsAt(transactions, positionsBeginDate));
  const beginSide = valueBoundary(beginOpen, begin);
  const common = {
    year,
    kind,
    beginValuationDate: begin.kind === "closes" ? begin.asOfDate : null,
    endValuationDate: end.kind === "closes" ? end.asOfDate : null,
    beginValue: beginSide.value,
    missingBeginTickers: beginSide.missingTickers,
    beginUnavailable: begin.kind === "unavailable",
    endUnavailable: end.kind === "unavailable",
  };

  // Early January: the latest published close still belongs to the previous year, so the selected year has
  // no period yet and all of its trades are reported as excluded. modifiedDietz is never reached.
  if (kind === "current" && positionsEndDate < yearStart) {
    return {
      ...common,
      status: "awaiting-first-close",
      period: {
        start: yearStart,
        endExclusive: yearStart,
        lastDay: null,
        calendarDays: 0,
        isRebasedStart: false,
        isInProgress: true,
        isClosedOut: false,
      },
      endValue: null,
      contributions: 0,
      withdrawals: 0,
      cashContributed: 0,
      investmentPerformance: null,
      totalReturn: null,
      averageCapital: null,
      missingEndTickers: [],
      excludedFlows: flowsAfter(transactions, yearStart, yearEnd),
    };
  }

  const rawEndExclusive =
    kind === "past" ? isoYearStart(year + 1) : addDays(positionsEndDate, 1);
  const flows = cashFlowsInPeriod(transactions, yearStart, rawEndExclusive);
  const excludedFlows = flowsAfter(transactions, rawEndExclusive, yearEnd);
  const endOpen = openPositions(positionsAt(transactions, positionsEndDate));
  const endSide = valueBoundary(endOpen, end);

  const period = annualPeriod({
    yearStart,
    rawEndExclusive,
    flows,
    hasBeginPositions: beginOpen.length > 0,
    isClosedOut: endOpen.length === 0 && flows.length > 0,
    isInProgress: kind === "current",
  });

  const cash = summarizeCashFlows(flows);
  const { value: beginValue } = beginSide;
  const { value: endValue } = endSide;
  const investmentPerformance =
    beginValue !== null && endValue !== null ? endValue - beginValue - cash.net : null;

  // Nothing held at the start and nothing traded: a 0 / 0 denominator would read as an undefined average
  // capital instead of the empty year it is, so the formula is not run at all.
  const nothingMeasurable = beginOpen.length === 0 && flows.length === 0;
  const dietz =
    !nothingMeasurable && beginValue !== null && endValue !== null
      ? modifiedDietz({
          beginValue,
          endValue,
          flows,
          start: period.start,
          endExclusive: period.endExclusive,
        })
      : null;

  return {
    ...common,
    status: annualStatus({ nothingMeasurable, excludedFlows, beginValue, endValue, dietz }),
    period,
    endValue,
    contributions: cash.contributions,
    withdrawals: cash.withdrawals,
    cashContributed: cash.net,
    investmentPerformance,
    totalReturn: dietz !== null && dietz.ok ? dietz.rate : null,
    averageCapital: dietz === null ? null : dietz.averageCapital,
    missingEndTickers: endSide.missingTickers,
    excludedFlows,
  };
}
