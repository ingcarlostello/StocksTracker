import type { LucideIcon } from "lucide-react";
import type { AppRoute } from "@/constants/routes.constants";

export type NavItem = {
  label: string;
  href: AppRoute;
  icon: LucideIcon;
};
