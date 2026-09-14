import { describe, expect, it } from "vitest";
import { blockedDeleteMessage, portfolioNameError, transactionCountLabel } from "./portfolio-management.utils";

const portfolios = [
  { id: "p1", name: "Retiro", createdAt: 1 },
  { id: "p2", name: "Viajes", createdAt: 2 },
];

describe("portfolioNameError", () => {
  it("accepts a new name", () => {
    expect(portfolioNameError("Carro soñado", portfolios)).toBeNull();
  });

  it("asks for a name", () => {
    expect(portfolioNameError("   ", portfolios)).toBe("Enter a portfolio name.");
  });

  it("rejects a name that is too long", () => {
    expect(portfolioNameError("a".repeat(41), portfolios)).toBe("Use 40 characters or fewer.");
  });

  it("rejects another portfolio's name, ignoring case and spaces", () => {
    expect(portfolioNameError("  viajes ", portfolios)).toBe("You already have a portfolio with this name.");
  });

  it("lets a renamed portfolio keep its own name", () => {
    expect(portfolioNameError("RETIRO", portfolios, "p1")).toBeNull();
  });
});

describe("blockedDeleteMessage", () => {
  it("uses singular and plural", () => {
    expect(blockedDeleteMessage(1)).toBe("This portfolio has 1 transaction. Delete them before deleting the portfolio.");
    expect(blockedDeleteMessage(3)).toBe("This portfolio has 3 transactions. Delete them before deleting the portfolio.");
  });
});

describe("transactionCountLabel", () => {
  it.each([
    [0, "No transactions"],
    [1, "1 transaction"],
    [12, "12 transactions"],
  ])("labels %i", (count, label) => {
    expect(transactionCountLabel(count)).toBe(label);
  });
});
