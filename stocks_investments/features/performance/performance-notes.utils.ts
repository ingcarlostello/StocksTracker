import type { AnnualPerformance } from "@/domain/performance/performance.type";
import { formatIsoDate } from "@/utils/date-format.utils";
import { formatSignedCurrency } from "@/utils/number-format.utils";
import { performanceDateRangeLabel } from "./performance-summary.utils";

// Why the selected year has nothing to measure. The zero-length period of early January is the only one
// without a last day, which is what tells the two cases apart.
function awaitingFirstCloseNote(performance: AnnualPerformance): string | null {
  const { year, endValuationDate, period } = performance;
  if (period.lastDay === null) {
    // Early January: the year had not started yet at the latest close.
    return endValuationDate === null
      ? `The latest published close is still in ${year - 1}, so ${year} has nothing to measure yet.`
      : `The latest published close (${formatIsoDate(endValuationDate)}) is before ${year} began, so ${year} has nothing to measure yet.`;
  }
  // With nothing to price, no boundary was queried and no close date came back; the period's last day is
  // the date every figure was built from, so it is the one to name.
  const closeDate = formatIsoDate(endValuationDate ?? period.lastDay);
  return `Every ${year} trade is dated after the latest published close (${closeDate}), so ${year} has nothing to measure yet.`;
}

// A boundary whose closes the provider no longer serves, or whose tickers had no bar that day. Cash
// Contributed comes from the transactions alone, so it stays exact on the starting side.
function beginPriceNote(performance: AnnualPerformance): string | null {
  const { year, beginUnavailable, missingBeginTickers, beginValuationDate } = performance;
  if (beginUnavailable) {
    return `Closes for the end of ${year - 1} are older than the history the market data plan provides, so ${year}'s Starting Value can't be calculated. Cash Contributed is still exact.`;
  }
  if (missingBeginTickers.length === 0 || beginValuationDate === null) return null;
  return `No close for ${missingBeginTickers.join(", ")} on ${formatIsoDate(beginValuationDate)}, so Starting Value, Investment Performance and Total Return can't be calculated. Cash Contributed is still exact.`;
}

function endPriceNote(performance: AnnualPerformance): string | null {
  const { year, endUnavailable, missingEndTickers, endValuationDate } = performance;
  if (endUnavailable) {
    return `Closes for the end of ${year} are older than the history the market data plan provides, so ${year}'s Ending Value can't be calculated.`;
  }
  if (missingEndTickers.length === 0 || endValuationDate === null) return null;
  return `No close for ${missingEndTickers.join(", ")} on ${formatIsoDate(endValuationDate)}, so Ending Value, Investment Performance and Total Return can't be calculated.`;
}

// Built from the period: its last day is both when the position closed and where the span ends. The
// "every trade" clause is dropped when a trade of the year sits after the valuation date, because the
// excluded-trades note below is about to say the opposite.
function closedOutNote(performance: AnnualPerformance): string | null {
  const { period, excludedFlows } = performance;
  if (!period.isClosedOut || period.lastDay === null) return null;
  const measured = `Total Return measures ${performanceDateRangeLabel(period.start, period.lastDay)} — the span in which capital was actually invested — instead of the full period.`;
  return excludedFlows.count === 0
    ? `Nothing was held after ${formatIsoDate(period.lastDay)}, so ${measured} Every trade of the year is included and the dollar figures are unchanged.`
    : `Nothing was held from ${formatIsoDate(period.lastDay)} to the latest published close, so ${measured} The dollar figures are unchanged.`;
}

// Trades of the year dated after the close the ending value came from: they are real, they are simply
// not measurable until that day's close is published.
function excludedFlowsNote(performance: AnnualPerformance): string | null {
  const { excludedFlows, endValuationDate, period } = performance;
  // A boundary with nothing to price is never queried, so it returns no close date; the period's last day
  // is the cut-off those trades fall after, and without it the trades would go unexplained.
  const cutoff = endValuationDate ?? period.lastDay;
  if (excludedFlows.count === 0 || cutoff === null) return null;

  const after = `dated after ${formatIsoDate(cutoff)} (${formatSignedCurrency(excludedFlows.net)} net)`;
  return excludedFlows.count === 1
    ? `1 trade ${after} isn't included yet; it counts once that day's close is published.`
    : `${excludedFlows.count} trades ${after} aren't included yet; they count once that day's close is published.`;
}

// Everything the year has to explain, in reading order: why a figure is missing, then why the measured
// period is not the plain calendar year, then which trades are still outside it.
export function performanceNotes(performance: AnnualPerformance): string[] {
  const { status, year } = performance;
  const notes: (string | null)[] = [
    status === "no-activity" ? `No holdings at the start of ${year} and no trades during the year.` : null,
    status === "awaiting-first-close" ? awaitingFirstCloseNote(performance) : null,
    beginPriceNote(performance),
    endPriceNote(performance),
    status === "undefined-average-capital"
      ? `Total Return can't be calculated for ${year}: sells withdrew more than the capital that was invested on average, so Modified Dietz has no positive base. The dollar figures are exact.`
      : null,
    closedOutNote(performance),
    excludedFlowsNote(performance),
  ];

  return notes.filter((note): note is string => note !== null);
}
