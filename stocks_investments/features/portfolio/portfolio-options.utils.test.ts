import { describe, expect, it } from "vitest";
import type { Id } from "@/convex/_generated/dataModel";
import { activePortfolioSelectOptions, portfolioSelectOptions } from "./portfolio-options.utils";

const portfolios = [
  { id: "p1" as Id<"portfolios">, name: "Retiro", createdAt: 1 },
  { id: "p2" as Id<"portfolios">, name: "Viajes", createdAt: 2 },
];

describe("portfolio select options", () => {
  it("lists portfolios in the given order", () => {
    expect(portfolioSelectOptions(portfolios)).toEqual([
      { value: "p1", label: "Retiro" },
      { value: "p2", label: "Viajes" },
    ]);
  });

  it("puts the combined view first in the sidebar selector", () => {
    expect(activePortfolioSelectOptions(portfolios)).toEqual([
      { value: "all", label: "All portfolios" },
      { value: "p1", label: "Retiro" },
      { value: "p2", label: "Viajes" },
    ]);
  });
});
