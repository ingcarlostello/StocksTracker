"use client";

import Link from "next/link";
import { useActiveRoute } from "@/hooks/use-active-route.hook";
import { NAV_ITEMS } from "./navigation.constants";

export function NavBar() {
  const isActive = useActiveRoute();

  return (
    <nav aria-label="Main">
      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = isActive(href);

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-accent-tint text-foreground"
                    : "text-muted hover:bg-surface hover:text-foreground"
                }`}
              >
                <Icon
                  aria-hidden="true"
                  className={`size-4 ${active ? "text-primary" : ""}`}
                  strokeWidth={1.75}
                />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
