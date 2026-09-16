import { Button } from "@/components/ui/button";
import { PERFORMANCE_TEXT } from "../performance.constants";

type PerformancePricesErrorProps = {
  message: string;
  // false while the failed boundary is fetching again or a rate-limit cooldown is running.
  canRetry: boolean;
  onRetry: () => void;
  cooldownMessage: string | null;
};

// The only control of the screen besides the year select: the closing prices a year needs failed, so
// nothing can be measured until they are fetched again.
export function PerformancePricesError({
  message,
  canRetry,
  onRetry,
  cooldownMessage,
}: PerformancePricesErrorProps) {
  return (
    <div className="flex max-w-xl flex-col items-start gap-3 rounded-lg border border-negative/40 bg-sell-tint p-4">
      <p role="alert" className="text-sm text-foreground">
        {message}
      </p>
      {cooldownMessage ? <p className="text-sm text-muted">{cooldownMessage}</p> : null}
      <Button variant="secondary" onClick={onRetry} disabled={!canRetry}>
        {PERFORMANCE_TEXT.RETRY_LABEL}
      </Button>
    </div>
  );
}
