import { useSyncExternalStore } from "react";

function subscribe(): () => void {
  return () => {};
}

// false during server rendering and hydration, true afterwards; avoids hydration mismatches for clock-dependent UI.
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
