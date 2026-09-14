import { useQuery } from "convex/react";
import { useMemo } from "react";
import { api } from "@/convex/_generated/api";
import { toPortfolioLike } from "@/domain/portfolio/portfolio.utils";
import type { PortfolioOption } from "../portfolio-selection.type";

// Reactive list in creation order; undefined while the first Convex result is loading.
export function usePortfolios(): PortfolioOption[] | undefined {
  const documents = useQuery(api.portfolios.list);
  return useMemo(() => documents?.map(toPortfolioLike), [documents]);
}
