import { describe, expect, it } from "vitest";
import { toPortfolioLike } from "./portfolio.utils";

describe("toPortfolioLike", () => {
  it("keeps the id, display name and creation time only", () => {
    const stored = { _id: "p1", _creationTime: 5, name: "Carro soñado", nameKey: "carro soñado", createdAt: 3 };
    expect(toPortfolioLike(stored)).toEqual({
      id: "p1",
      name: "Carro soñado",
      createdAt: 3,
    });
  });
});
