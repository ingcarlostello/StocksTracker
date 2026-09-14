import { describe, expect, it } from "vitest";
import { buildPositions } from "@/domain/portfolio/position.service";
import { calculateTotalAmount } from "@/domain/transactions/transaction-validation.service";
import type { Id } from "@/convex/_generated/dataModel";
import type { TransactionFormValues } from "./transaction-form.type";
import {
  availablePortfolioId,
  buildTransactionInput,
  defaultFormPortfolioId,
  fieldErrorsFromIssues,
  positionSizeDisplay,
  quantityFromFormValues,
} from "./transaction-form.utils";

const TODAY = "2025-06-15";

function form(overrides: Partial<TransactionFormValues> = {}): TransactionFormValues {
  return {
    portfolioId: "p-retiro",
    type: "BUY",
    ticker: "tsla ",
    date: "2025-06-10",
    price: "200",
    sizeField: "amount",
    sizeText: "75",
    ...overrides,
  };
}

describe("positionSizeDisplay", () => {
  it("user example: price 200 and amount 75 → 0.375 shares", () => {
    expect(positionSizeDisplay(form())).toEqual({ amount: "75", quantity: "0.375" });
  });

  it("shares typed → amount calculated with 2 decimals", () => {
    expect(positionSizeDisplay(form({ sizeField: "quantity", sizeText: "10", price: "150.255" }))).toEqual({
      quantity: "10",
      amount: "1502.55",
    });
  });

  it("shows a repeating share count with 9 decimals", () => {
    expect(positionSizeDisplay(form({ price: "333", sizeText: "100" })).quantity).toBe("0.3003003");
  });

  it("shows very small share counts instead of 0", () => {
    expect(positionSizeDisplay(form({ price: "500000000", sizeText: "1" })).quantity).toBe("0.000000002");
  });

  it.each([
    [{ price: "" }],
    [{ price: "abc" }],
    [{ sizeText: "" }],
    [{ sizeText: "0" }],
  ])("leaves the calculated input empty until both numbers are valid (%j)", (overrides) => {
    expect(positionSizeDisplay(form(overrides)).quantity).toBe("");
    expect(positionSizeDisplay(form({ ...overrides, sizeField: "quantity" })).amount).toBe("");
  });

  it("rounds the calculated amount like the currency shown elsewhere (3.5 × 200.15 → 700.53)", () => {
    expect(positionSizeDisplay(form({ sizeField: "quantity", sizeText: "3.5", price: "200.15" })).amount).toBe("700.53");
  });

  it.each([
    ["75", "333"],
    ["100", "3"],
    ["50", "210.37"],
    ["1234.56", "7"],
  ])("selling the shown share count later closes a position bought as $%s at $%s", (amount, price) => {
    const bought = buildTransactionInput(form({ sizeText: amount, price }), TODAY);
    if (!bought.ok) throw new Error("expected a valid buy");
    const shownShares = positionSizeDisplay(form({ sizeText: amount, price })).quantity;
    const sold = buildTransactionInput(form({ type: "SELL", sizeField: "quantity", sizeText: shownShares, price }), TODAY);
    if (!sold.ok) throw new Error("expected a valid sell");
    const [position] = buildPositions([
      { ...bought.input, id: "b", totalAmount: 0, createdAt: 1 },
      { ...sold.input, id: "s", totalAmount: 0, createdAt: 2 },
    ]);
    expect(position.shares).toBe(0);
  });

  it("keeps the driver text exactly as typed", () => {
    expect(positionSizeDisplay(form({ sizeText: "75." })).amount).toBe("75.");
    expect(positionSizeDisplay(form({ sizeField: "quantity", sizeText: ".5" })).quantity).toBe(".5");
  });
});

describe("buildTransactionInput", () => {
  it("derives the exact share count from amount ÷ price", () => {
    expect(buildTransactionInput(form(), TODAY)).toEqual({
      ok: true,
      input: { portfolioId: "p-retiro", type: "BUY", ticker: "TSLA", date: "2025-06-10", quantity: 0.375, price: 200 },
    });
  });

  it("does not round a repeating share count, so the saved total stays at the typed amount", () => {
    const result = buildTransactionInput(form({ price: "333", sizeText: "100" }), TODAY);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.input.quantity).toBe(100 / 333);
    expect(calculateTotalAmount(result.input.quantity, result.input.price)).toBeCloseTo(100, 10);
  });

  it("uses typed shares when shares drive", () => {
    expect(buildTransactionInput(form({ sizeField: "quantity", sizeText: "10", price: "150.25" }), TODAY)).toMatchObject({
      ok: true,
      input: { quantity: 10, price: 150.25 },
    });
  });

  it("reports an invalid amount on the amount input, not on shares", () => {
    expect(buildTransactionInput(form({ sizeText: "abc" }), TODAY)).toEqual({
      ok: false,
      fieldErrors: { amount: "Enter an amount greater than 0." },
    });
  });

  it("flags only the price when a valid amount has no usable price", () => {
    expect(buildTransactionInput(form({ price: "" }), TODAY)).toEqual({
      ok: false,
      fieldErrors: { price: "Enter a price greater than 0." },
    });
  });

  it("flags both when amount and price are invalid", () => {
    expect(buildTransactionInput(form({ price: "", sizeText: "" }), TODAY)).toEqual({
      ok: false,
      fieldErrors: { price: "Enter a price greater than 0.", amount: "Enter an amount greater than 0." },
    });
  });

  it("reports invalid shares on the shares input when shares drive", () => {
    expect(buildTransactionInput(form({ sizeField: "quantity", sizeText: "1,5" }), TODAY)).toEqual({
      ok: false,
      fieldErrors: { quantity: "Enter a number of shares greater than 0." },
    });
  });

  it("asks for a portfolio when none is chosen", () => {
    expect(buildTransactionInput(form({ portfolioId: "" }), TODAY)).toEqual({
      ok: false,
      fieldErrors: { portfolioId: "Choose a portfolio." },
    });
  });

  it("reports every other invalid field with English messages", () => {
    expect(buildTransactionInput(form({ ticker: "", date: "2025-06-16" }), TODAY)).toEqual({
      ok: false,
      fieldErrors: {
        ticker: "Enter a valid US ticker, like AAPL or BRK.B.",
        date: "The date can't be in the future.",
      },
    });
    expect(buildTransactionInput(form({ date: "" }), TODAY)).toMatchObject({
      ok: false,
      fieldErrors: { date: "Enter a valid date." },
    });
  });
});

describe("portfolio choice", () => {
  const retiro = { id: "p-retiro" as Id<"portfolios">, name: "Retiro", createdAt: 1 };
  const viajes = { id: "p-viajes" as Id<"portfolios">, name: "Viajes", createdAt: 2 };

  it("defaults to the portfolio selected in the sidebar", () => {
    expect(defaultFormPortfolioId({ kind: "portfolio", portfolio: viajes }, [retiro, viajes])).toBe("p-viajes");
  });

  it("defaults to the only portfolio in the combined view", () => {
    expect(defaultFormPortfolioId({ kind: "all" }, [retiro])).toBe("p-retiro");
  });

  it("makes the user choose in the combined view when there are several", () => {
    expect(defaultFormPortfolioId({ kind: "all" }, [retiro, viajes])).toBe("");
  });

  it("drops a chosen portfolio that no longer exists", () => {
    expect(availablePortfolioId("p-viajes", [retiro, viajes])).toBe("p-viajes");
    expect(availablePortfolioId("p-deleted", [retiro, viajes])).toBe("");
  });

  it("shows a server-side unknown portfolio on the portfolio field", () => {
    expect(fieldErrorsFromIssues([{ field: "portfolioId", code: "UNKNOWN_PORTFOLIO" }])).toEqual({
      portfolioId: "This portfolio no longer exists. Choose another one.",
    });
  });
});

describe("fieldErrorsFromIssues", () => {
  it("keeps the first message for a field", () => {
    expect(
      fieldErrorsFromIssues([
        { field: "date", code: "INVALID_DATE" },
        { field: "date", code: "FUTURE_DATE" },
      ]),
    ).toEqual({ date: "Enter a valid date." });
  });

  it("moves a server quantity issue onto the amount input when the amount drives", () => {
    expect(fieldErrorsFromIssues([{ field: "quantity", code: "INVALID_QUANTITY" }], "amount")).toEqual({
      amount: "Enter an amount greater than 0.",
    });
  });
});

describe("quantityFromFormValues", () => {
  it("reads typed shares as the number", () => {
    expect(quantityFromFormValues(form({ sizeField: "quantity", sizeText: "10.5" }))).toBe(10.5);
  });

  it("divides an amount by the price, unrounded", () => {
    expect(quantityFromFormValues(form({ sizeText: "100", price: "333" }))).toBe(100 / 333);
  });

  it.each([
    [{ sizeField: "quantity" as const, sizeText: "1,5" }],
    [{ sizeText: "abc" }],
    [{ sizeText: "0" }],
    [{ price: "" }],
  ])("is NaN when the share count cannot be computed (%j)", (overrides) => {
    expect(quantityFromFormValues(form(overrides))).toBeNaN();
  });
});
