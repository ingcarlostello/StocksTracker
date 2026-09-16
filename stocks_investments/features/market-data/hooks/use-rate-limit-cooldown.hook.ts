import { useEffect, useState } from "react";
import { PRICES_RATE_LIMIT_FALLBACK_SECONDS } from "../prices.constants";
import { PricesApiError } from "../prices.errors";

// True from a 429 response until its Retry-After has elapsed, so a control that would spend another
// request stays disabled. Re-renders once on its own when the timer fires.
export function useRateLimitCooldown(error: unknown, errorUpdatedAt: number): boolean {
  const rateLimitError = error instanceof PricesApiError && error.code === "RATE_LIMITED" ? error : null;
  const rateLimitedAt = rateLimitError ? errorUpdatedAt : null;
  const [cooldownEndedFor, setCooldownEndedFor] = useState<number | null>(null);

  useEffect(() => {
    if (rateLimitedAt === null) return;
    const waitSeconds = rateLimitError?.retryAfterSeconds ?? PRICES_RATE_LIMIT_FALLBACK_SECONDS;
    const remainingMs = Math.max(0, rateLimitedAt + waitSeconds * 1000 - Date.now());
    const timer = setTimeout(() => setCooldownEndedFor(rateLimitedAt), remainingMs);
    return () => clearTimeout(timer);
  }, [rateLimitError, rateLimitedAt]);

  return rateLimitedAt !== null && cooldownEndedFor !== rateLimitedAt;
}
