import { describe, expect, it } from "vitest";
import { countTransactionsByPortfolio } from "./portfolio-list.utils";

describe("countTransactionsByPortfolio", () => {
  it("counts transactions per portfolio", () => {
    const counts = countTransactionsByPortfolio([{ portfolioId: "p1" }, { portfolioId: "p2" }, { portfolioId: "p1" }]);
    expect(Object.fromEntries(counts)).toEqual({ p1: 2, p2: 1 });
  });

  it("leaves portfolios without transactions out", () => {
    expect(countTransactionsByPortfolio([]).get("p1")).toBeUndefined();
  });
});
