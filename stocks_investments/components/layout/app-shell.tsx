import type { ReactNode } from "react";
import Link from "next/link";
import { ROUTES } from "@/constants/routes.constants";
import { AppLogo } from "./app-logo";
import { NavBar } from "./nav-bar";

type AppShellProps = {
  // Rendered between the logo and the navigation (the active portfolio selector).
  sidebarHeader?: ReactNode;
  children: ReactNode;
};

export function AppShell({ sidebarHeader, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col gap-8 border-r border-border px-4 py-6">
        <Link href={ROUTES.DASHBOARD} className="px-3">
          <AppLogo />
        </Link>
        {sidebarHeader}
        <NavBar />
      </aside>
      <main className="flex-1 px-10 py-8">{children}</main>
    </div>
  );
}
