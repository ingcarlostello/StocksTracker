/**
 * True when `pathname` is `href` itself or one of its nested routes
 * (e.g. "/transactions/123" is inside "/transactions", "/transactions-old" is not).
 */
export function isRouteActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
