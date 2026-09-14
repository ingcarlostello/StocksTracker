import { describe, expect, it } from "vitest";
import { PORTFOLIO_NAME_MAX_LENGTH } from "./portfolio.constants";
import {
  isPortfolioNameTaken,
  normalizePortfolioName,
  portfolioNameKey,
  validatePortfolioName,
} from "./portfolio-name.service";

describe("normalizePortfolioName", () => {
  it("trims and collapses inner whitespace", () => {
    expect(normalizePortfolioName("  Carro \t  soñado ")).toBe("Carro soñado");
  });

  it("treats a decomposed ñ like the composed one", () => {
    expect(normalizePortfolioName("son\u0303ado")).toBe("so\u00f1ado");
  });
});

describe("portfolioNameKey", () => {
  it("ignores case and extra spaces", () => {
    expect(portfolioNameKey("  RETIRO ")).toBe(portfolioNameKey("retiro"));
  });
});

describe("validatePortfolioName", () => {
  it("returns the normalized name and its key", () => {
    expect(validatePortfolioName("  Carro  Soñado ")).toEqual({ ok: true, name: "Carro Soñado", nameKey: "carro soñado" });
  });

  it.each(["", "   ", "\n\t"])("rejects an empty name %j", (name) => {
    expect(validatePortfolioName(name)).toEqual({ ok: false, code: "EMPTY_NAME" });
  });

  it("accepts the maximum length counted in characters, not UTF-16 units", () => {
    expect(validatePortfolioName("ñ".repeat(PORTFOLIO_NAME_MAX_LENGTH)).ok).toBe(true);
    expect(validatePortfolioName("🏖".repeat(PORTFOLIO_NAME_MAX_LENGTH)).ok).toBe(true);
  });

  it("rejects a name longer than the maximum after trimming", () => {
    expect(validatePortfolioName(` ${"a".repeat(PORTFOLIO_NAME_MAX_LENGTH + 1)} `)).toEqual({
      ok: false,
      code: "NAME_TOO_LONG",
    });
  });
});

describe("isPortfolioNameTaken", () => {
  const portfolios = [
    { id: "p1", name: "Retiro", createdAt: 1 },
    { id: "p2", name: "Viajes", createdAt: 2 },
  ];

  it("matches another portfolio's name regardless of case and spacing", () => {
    expect(isPortfolioNameTaken(portfolios, " retiro ")).toBe(true);
  });

  it("allows a new name", () => {
    expect(isPortfolioNameTaken(portfolios, "Carro soñado")).toBe(false);
  });

  it("lets a portfolio keep its own name with different casing", () => {
    expect(isPortfolioNameTaken(portfolios, "RETIRO", "p1")).toBe(false);
    expect(isPortfolioNameTaken(portfolios, "viajes", "p1")).toBe(true);
  });
});
