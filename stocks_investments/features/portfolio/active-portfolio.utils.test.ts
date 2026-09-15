import { describe, expect, it } from "vitest";
import type { Id } from "@/convex/_generated/dataModel";
import { ALL_PORTFOLIOS_VALUE } from "./active-portfolio.constants";
import {
  activePortfolioScopeLabel,
  activePortfolioValue,
  resolveActivePortfolio,
  scopeOfActivePortfolio,
} from "./active-portfolio.utils";

const retiro = { id: "p1" as Id<"portfolios">, name: "Retiro", createdAt: 1 };
const viajes = { id: "p2" as Id<"portfolios">, name: "Viajes", createdAt: 2 };

describe("resolveActivePortfolio", () => {
  it("selects the stored portfolio", () => {
    expect(resolveActivePortfolio([retiro, viajes], "p2")).toEqual({ kind: "portfolio", portfolio: viajes });
  });

  it.each([
    ["nothing stored", null],
    ["the combined view", ALL_PORTFOLIOS_VALUE],
    ["a deleted portfolio", "p-deleted"],
  ])("falls back to all portfolios for %s", (_label, stored) => {
    expect(resolveActivePortfolio([retiro, viajes], stored)).toEqual({ kind: "all" });
  });
});

describe("scope and selector value", () => {
  it("maps a single portfolio to its id", () => {
    const active = resolveActivePortfolio([retiro], "p1");
    expect(scopeOfActivePortfolio(active)).toEqual({ kind: "portfolio", portfolioId: "p1" });
    expect(activePortfolioValue(active)).toBe("p1");
  });

  it("maps the combined view", () => {
    expect(scopeOfActivePortfolio({ kind: "all" })).toEqual({ kind: "all" });
    expect(activePortfolioValue({ kind: "all" })).toBe(ALL_PORTFOLIOS_VALUE);
  });
});

describe("activePortfolioScopeLabel", () => {
  it("labels the combined view in lowercase", () => {
    expect(activePortfolioScopeLabel({ kind: "all" })).toBe("all portfolios");
  });

  it("labels a single portfolio by its name", () => {
    expect(activePortfolioScopeLabel({ kind: "portfolio", portfolio: retiro })).toBe("Retiro");
  });
});
