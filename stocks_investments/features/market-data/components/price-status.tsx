import { RefreshCw } from "lucide-react";
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
        <button
          type="button"
          onClick={onRefresh}
          disabled={!canRefresh}
          className="inline-flex items-center gap-2 rounded-md border border-primary/60 bg-accent-outline px-3 py-1.5 text-sm font-medium text-primary transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw aria-hidden="true" className={`size-4 ${isFetching ? "animate-spin" : ""}`} strokeWidth={1.75} />
          Refresh Prices
        </button>
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
