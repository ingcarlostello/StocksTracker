import { PriceAlerts } from "./price-alerts";
import { PriceStatusLabel } from "./price-status-label";
import { RefreshPricesButton } from "./refresh-prices-button";

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
        <PriceStatusLabel isPending={isPending} asOfDate={asOfDate} lastUpdatedAt={lastUpdatedAt} />
        <RefreshPricesButton isFetching={isFetching} canRefresh={canRefresh} onRefresh={onRefresh} />
      </div>
      <PriceAlerts errorMessage={errorMessage} missing={missing} />
    </div>
  );
}
