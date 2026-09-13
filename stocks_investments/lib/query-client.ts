import { QueryClient } from "@tanstack/react-query";

let browserQueryClient: QueryClient | undefined;

function makeQueryClient() {
  return new QueryClient();
}

/**
 * Server: a fresh client per render so requests never share cache.
 * Browser: one client for the whole session, kept at module scope so React
 * suspending during the initial render does not recreate it.
 */
export function getQueryClient() {
  if (typeof window === "undefined") return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
