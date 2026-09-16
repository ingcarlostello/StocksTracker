import { blockedPortfolioView } from "@/features/portfolio/portfolio-view.utils";
import { toPerformanceCards } from "./performance-cards.utils";
import { PERFORMANCE_MESSAGES } from "./performance-messages.constants";
import { performanceNotes } from "./performance-notes.utils";
import { toPerformanceSummary } from "./performance-summary.utils";
import { yearSelectOptions } from "./performance-year.utils";
import type {
  AnnualPerformanceState,
  PerformanceCardsModel,
  PerformanceContent,
  PerformanceViewInput,
  PerformanceViewState,
} from "./performance.type";

type ReadyPerformanceView = Extract<PerformanceViewState, { status: "ready" }>;

function toPerformanceContent(annual: AnnualPerformanceState, scopeLabel: string): PerformanceContent {
  if (annual.kind === "loading") {
    return { kind: "loading", message: PERFORMANCE_MESSAGES.LOADING_PRICES };
  }
  if (annual.kind === "error") {
    return {
      kind: "error",
      message: annual.message,
      canRetry: annual.canRetry,
      onRetry: annual.retry,
      cooldownMessage: annual.isRateLimited ? PERFORMANCE_MESSAGES.RATE_LIMIT_COOLDOWN : null,
    };
  }

  const { performance } = annual;
  return {
    kind: "ready",
    cards: toPerformanceCards(performance),
    summary: toPerformanceSummary(performance, scopeLabel),
    notes: performanceNotes(performance),
  };
}

// A missing Total Return means every measured figure is missing, so one word replaces both of them.
function readyAnnouncement(year: string, cards: PerformanceCardsModel): string {
  const { totalReturn, investmentPerformance } = cards;
  if (totalReturn.value.sign === null) return `${year} · Total Return unavailable.`;
  return `${year} · Total Return ${totalReturn.value.label}, Investment Performance ${investmentPerformance.value.label}.`;
}

// One short sentence for the polite live region, rebuilt whenever the year, the scope or the content
// changes. The blocked states render their own visible text and announce nothing.
export function performanceAnnouncement(state: PerformanceViewState): string {
  if (state.status !== "ready") return "";
  const year = state.year.value;
  switch (state.content.kind) {
    case "loading":
      return `Loading ${year} performance.`;
    case "error":
      return `Could not load ${year} closing prices.`;
    case "ready":
      return readyAnnouncement(year, state.content.cards);
  }
}

// Everything /performance renders. The year select is built the same way whatever the content is: a
// rate limit is gated on the boundary that needs a fetch, never on a control that costs nothing.
export function buildPerformanceView(input: PerformanceViewInput): PerformanceViewState {
  const { history, years, selectedYear, onSelectYear, annual, scopeLabel } = input;

  // Shared with /portfolio and /dashboard: same states, same messages.
  if (history.status !== "ready") return blockedPortfolioView(history);
  if (selectedYear === null || years.length === 0) return { status: "empty" };

  const state: ReadyPerformanceView = {
    status: "ready",
    year: { value: String(selectedYear), options: yearSelectOptions(years), onChange: onSelectYear },
    announcement: "",
    content: toPerformanceContent(annual, scopeLabel),
  };
  return { ...state, announcement: performanceAnnouncement(state) };
}
