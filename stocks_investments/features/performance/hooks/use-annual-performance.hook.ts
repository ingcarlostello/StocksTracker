import { useQueries } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useRateLimitCooldown } from "@/features/market-data/hooks/use-rate-limit-cooldown.hook";
import {
  annualPerformanceArgs,
  blockingBoundarySide,
  boundaryQueryOptions,
  resolveAnnualPerformance,
  resolveBoundary,
} from "../annual-performance-query.utils";
import type {
  AnnualPerformanceArgs,
  AnnualPerformanceResolution,
  AnnualPerformanceState,
} from "../performance.type";

const LOADING_RESOLUTION: AnnualPerformanceResolution = { kind: "loading" };
const LOADING_STATE: AnnualPerformanceState = { kind: "loading" };

// The measured year, from the transactions the scope holds. Called on every render, including while the
// history is loading or blocked and while no year is resolvable: both boundary slots then price nothing,
// so the hook order never changes and no request is issued.
export function useAnnualPerformance(args: AnnualPerformanceArgs): AnnualPerformanceState {
  const { transactions, year, today } = args;
  const request = useMemo(
    () => annualPerformanceArgs({ transactions, year, today }),
    [transactions, year, today],
  );

  const [beginResult, endResult] = useQueries({
    queries: [boundaryQueryOptions(request.specs[0], "begin"), boundaryQueryOptions(request.specs[1], "end")],
  });

  const boundaries = useMemo(
    () =>
      request.idle
        ? null
        : {
            begin: resolveBoundary(request.plan.begin, beginResult),
            end: resolveBoundary(request.plan.end, endResult),
          },
    [request, beginResult, endResult],
  );

  const resolution = useMemo(
    () =>
      request.idle || boundaries === null
        ? LOADING_RESOLUTION
        : resolveAnnualPerformance(request.plan, transactions, boundaries.begin, boundaries.end),
    [request, transactions, boundaries],
  );

  // The slot whose failure is the one being shown. It is read from the resolved boundaries, not from the
  // raw query errors: a boundary outside the provider's history resolves to "unavailable" while keeping its
  // rejection, so picking by error would gate the cooldown on a 404 and retry a request that cannot succeed.
  const blocking = boundaries === null ? null : blockingBoundarySide(boundaries.begin, boundaries.end);
  const failed = blocking === "begin" ? beginResult : blocking === "end" ? endResult : null;
  const isCoolingDown = useRateLimitCooldown(failed?.error ?? null, failed?.errorUpdatedAt ?? 0);

  const retry = useCallback(() => {
    // cancelRefetch: false, so two clicks in one task reuse the request in flight instead of starting a
    // second one (the fetch carries no AbortSignal, so cancelling would not stop it).
    if (failed !== null) void failed.refetch({ cancelRefetch: false });
  }, [failed]);

  if (resolution.kind === "loading") return LOADING_STATE;
  if (resolution.kind === "ready") return { kind: "ready", performance: resolution.performance };
  return {
    kind: "error",
    message: resolution.message,
    canRetry: !beginResult.isFetching && !endResult.isFetching && !isCoolingDown,
    isRateLimited: resolution.isRateLimited && isCoolingDown,
    retry,
  };
}
