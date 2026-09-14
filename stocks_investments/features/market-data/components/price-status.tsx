import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatIsoDate } from "@/utils/date-format.utils";

type PriceStatusProps = {
  asOfDate: string | null;
  lastUpdatedAt: number | null;
  missing: string[];
  isPending: boolean;
  isFetching: boolean;
  errorMessage: string | null;
  canRefresh: boolean;
  onRefresh: () => void;
};

export function PriceStatus({
  asOfDate,
  lastUpdatedAt,
  missing,
  isPending,
  isFetching,
  errorMessage,
  canRefresh,
  onRefresh,
}: PriceStatusProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">
          {isPending
            ? "Loading prices…"
            : asOfDate
              ? `Close of ${formatIsoDate(asOfDate)}${lastUpdatedAt ? ` · updated ${formatDateTime(lastUpdatedAt)}` : ""}`
              : "Prices not loaded"}
        </p>
        <Button variant="outline-accent" onClick={onRefresh} disabled={!canRefresh}>
          <RefreshCw aria-hidden="true" className={`size-4 ${isFetching ? "animate-spin" : ""}`} strokeWidth={1.75} />
          Refresh Prices
        </Button>
      </div>
      {errorMessage ? (
        <p role="alert" className="text-sm text-negative">
          {errorMessage}
        </p>
      ) : null}
      {missing.length > 0 ? (
        <p className="text-sm text-muted">No close available for {missing.join(", ")}.</p>
      ) : null}
    </div>
  );
}
