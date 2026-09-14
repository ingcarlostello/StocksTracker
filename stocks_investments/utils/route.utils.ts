/**
 * True when `pathname` is `href` itself or one of its nested routes
 * (e.g. "/transactions/123" is inside "/transactions", "/transactions-old" is not).
 */
export function isRouteActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

// `query` is an already serialized query string without the leading "?".
export function withQuery(path: string, query: string): string {
  return query ? `${path}?${query}` : path;
}

// Page `searchParams` records hold arrays for repeated keys; only the first value counts.
export function searchParamsFromRecord(
  record: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(record)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first !== undefined) params.set(key, first);
  }
  return params;
}
