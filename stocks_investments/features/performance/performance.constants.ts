import { NOT_AVAILABLE_LABEL } from "@/constants/format.constants";
import type { SignedCell } from "@/types/display-sign.type";

export const PERFORMANCE_TEXT = {
  TITLE: "Performance",
  SUBTITLE: "Track your investment performance over time.",
  YEAR_LABEL: "Year",
  // Screen-reader heading of the stat cards, which the mockup shows without a visible title.
  CARDS_HEADING: "Key figures",
  SUMMARY_TITLE: "Performance Summary",
  SUMMARY_FOOTNOTE: "Performance takes into account all buys and sells during the period.",
  METHODOLOGY_TITLE: "How Total Return is calculated",
  RETRY_LABEL: "Try again",
} as const;

export const PERFORMANCE_CARD_LABELS = {
  // The current year is the mockup's "(YTD)"; a past year names itself: "Total Return (2025)".
  TOTAL_RETURN: "Total Return",
  TOTAL_RETURN_YTD: "Total Return (YTD)",
  TOTAL_RETURN_CAPTION: "Modified Dietz",
  CASH_CONTRIBUTED: "Cash Contributed",
  INVESTMENT_PERFORMANCE: "Investment Performance",
  // Occupies the slot where the mockup wrote "(time-weighted)".
  INVESTMENT_PERFORMANCE_CAPTION: "Excludes cash contributed",
} as const;

export const PERFORMANCE_SUMMARY_LABELS = {
  // The first and third rows are completed with the period's dates: "Starting Value (Jan 1, 2025)".
  STARTING_VALUE: "Starting Value",
  CASH_CONTRIBUTED: "Cash Contributed",
  ENDING_VALUE: "Ending Value",
  INVESTMENT_PERFORMANCE: "Investment Performance",
  TOTAL_RETURN: "Total Return (Modified Dietz)",
} as const;

export const PERFORMANCE_SECTION_IDS = {
  CARDS: "performance-cards",
  SUMMARY: "performance-summary",
  METHODOLOGY: "performance-methodology",
} as const;

export const PERFORMANCE_YEAR_SELECT_ID = "performance-year";

// A figure the selected year cannot produce; rendered muted, never coloured.
export const PERFORMANCE_UNAVAILABLE_CELL: SignedCell = { label: NOT_AVAILABLE_LABEL, sign: null };
