import { useState } from "react";
import { marketToday } from "@/domain/market-data/trading-date.service";

// Today in New York, read once on mount: a date that changed mid-session would silently move every boundary
// the screen already computed. Lazy initializer, so the clock is read only when the component first renders.
export function useMarketToday(): string {
  return useState(marketToday)[0];
}
