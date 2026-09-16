export const PERFORMANCE_MESSAGES = {
  // The whole screen, while the active portfolio or the transactions are still loading.
  LOADING: "Loading performance…",
  // Only the measured year, while a boundary's closes are in flight.
  LOADING_PRICES: "Loading closing prices…",
  EMPTY: "No transactions yet. Add a transaction to see your performance.",
  // Shown next to a disabled "Try again" while the provider's 429 cooldown runs.
  RATE_LIMIT_COOLDOWN: "Price requests are rate-limited right now. Try again in about a minute.",
} as const;

// Joined with " · " under the period line; each one explains why the period is not the plain calendar year.
export const PERFORMANCE_PERIOD_NOTES = {
  REBASED_START: "measured from your first trade of the year",
  IN_PROGRESS: "in progress",
  NOTHING_MEASURED: "nothing measured yet",
} as const;

// The four things the methodology has to answer: which method, which data, how buys and sells count,
// and what Investment Performance is.
export const PERFORMANCE_METHODOLOGY = [
  "Total Return uses the Modified Dietz method: (Ending Value − Starting Value − Cash Contributed) ÷ (Starting Value + each cash flow weighted by the part of the period that followed it). Money added late in the year therefore counts less. It approximates the period's money-weighted return; it is not a time-weighted return, and it is never annualised. The period measured is the calendar year, trimmed to your first trade of the year when you held nothing on January 1, and to your last trade when you held nothing at the end — so the rate is never spread over days with no capital invested.",
  "Share counts come from your transactions. Values use unadjusted end-of-day closes: the last close of the previous year, and the last close of the selected year — for the year in progress, the latest published close. Closes are stored the first time they are fetched.",
  "A buy is a contribution and a sell is a withdrawal, at its total amount as recorded. Cash Contributed = buys − sells, so it is negative when you sold more than you bought. A sale takes its proceeds out of the portfolio; the gain realised on it stays inside Investment Performance.",
  "Ending Value − Starting Value − Cash Contributed: the realised and unrealised gains of the period, never the money you added. Dividends, fees, taxes and share splits are not tracked, so they are not part of this number.",
] as const;
