import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type RefreshPricesButtonProps = {
  isFetching: boolean;
  canRefresh: boolean;
  onRefresh: () => void;
};

export function RefreshPricesButton({ isFetching, canRefresh, onRefresh }: RefreshPricesButtonProps) {
  return (
    <Button variant="outline-accent" onClick={onRefresh} disabled={!canRefresh}>
      <RefreshCw aria-hidden="true" className={`size-4 ${isFetching ? "animate-spin" : ""}`} strokeWidth={1.75} />
      Refresh Prices
    </Button>
  );
}
