import { describe, expect, it } from "vitest";
import type { Id } from "@/convex/_generated/dataModel";
import { countTransactionsByPortfolio, portfolioNamesById } from "./portfolio-list.utils";

describe("countTransactionsByPortfolio", () => {
  it("counts transactions per portfolio", () => {
    const counts = countTransactionsByPortfolio([{ portfolioId: "p1" }, { portfolioId: "p2" }, { portfolioId: "p1" }]);
    expect(Object.fromEntries(counts)).toEqual({ p1: 2, p2: 1 });
  });

  it("leaves portfolios without transactions out", () => {
    expect(countTransactionsByPortfolio([]).get("p1")).toBeUndefined();
  });
});

describe("portfolioNamesById", () => {
  it("maps ids to names", () => {
    const names = portfolioNamesById([
      { id: "p1" as Id<"portfolios">, name: "Retiro" },
      { id: "p2" as Id<"portfolios">, name: "Viajes" },
    ]);
    expect(Object.fromEntries(names)).toEqual({ p1: "Retiro", p2: "Viajes" });
    expect(names.get("p-deleted")).toBeUndefined();
  });
});
