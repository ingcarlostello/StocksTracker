import { formatDateTime, formatIsoDate } from "@/utils/date-format.utils";
import { PRICE_STATUS_MESSAGES } from "./prices-messages.constants";
import type { PricesState } from "./prices-state.type";

// Byte-identical to the former inline expression of PriceStatus (same truthiness: !asOfDate, lastUpdatedAt ?).
// "Loading prices…" | "Prices not loaded" | "Close of Sep 14, 2026" | "Close of Sep 14, 2026 · updated Sep 15, 2026 10:24 AM"
export function priceStatusLabel(state: Pick<PricesState, "isPending" | "asOfDate" | "lastUpdatedAt">): string {
  if (state.isPending) return PRICE_STATUS_MESSAGES.LOADING;
  if (!state.asOfDate) return PRICE_STATUS_MESSAGES.NOT_LOADED;
  const updated = state.lastUpdatedAt ? ` · updated ${formatDateTime(state.lastUpdatedAt)}` : "";
  return `Close of ${formatIsoDate(state.asOfDate)}${updated}`;
}

// null when every ticker has a close.
export function missingClosesMessage(missing: readonly string[]): string | null {
  return missing.length === 0 ? null : `No close available for ${missing.join(", ")}.`;
}
