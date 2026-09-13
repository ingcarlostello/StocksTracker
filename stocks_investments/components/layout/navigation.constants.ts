import { BriefcaseBusiness, ChartLine, House, List } from "lucide-react";
import { ROUTES } from "@/constants/routes.constants";
import type { NavItem } from "./navigation.type";

// Settings and Log out from the mockup are omitted: the app has no settings or auth.
export const NAV_ITEMS: readonly NavItem[] = [
  { label: "Dashboard", href: ROUTES.DASHBOARD, icon: House },
  { label: "Portfolio", href: ROUTES.PORTFOLIO, icon: BriefcaseBusiness },
  { label: "Transactions", href: ROUTES.TRANSACTIONS, icon: List },
  { label: "Performance", href: ROUTES.PERFORMANCE, icon: ChartLine },
];
