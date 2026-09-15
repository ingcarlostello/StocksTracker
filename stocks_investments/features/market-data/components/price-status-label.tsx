import { priceStatusLabel } from "../price-status.utils";
import type { PricesState } from "../prices-state.type";

type PriceStatusLabelProps = Pick<PricesState, "isPending" | "asOfDate" | "lastUpdatedAt">;

// Polite live region: a finished refresh announces the new "updated" time.
export function PriceStatusLabel({ isPending, asOfDate, lastUpdatedAt }: PriceStatusLabelProps) {
  return (
    <p className="text-sm text-muted" aria-live="polite">
      {priceStatusLabel({ isPending, asOfDate, lastUpdatedAt })}
    </p>
  );
}
