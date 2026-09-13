import { usePathname } from "next/navigation";
import { isRouteActive } from "@/utils/route.utils";

/** Returns a predicate telling whether a navigation href matches the current URL. */
export function useActiveRoute() {
  const pathname = usePathname();

  return (href: string) => isRouteActive(pathname, href);
}
