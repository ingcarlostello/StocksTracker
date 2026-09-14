import { describe, expect, it } from "vitest";
import type { Id } from "@/convex/_generated/dataModel";
import { calculateTotalAmount } from "@/domain/transactions/transaction-validation.service";
import type { TransactionInput, TransactionLike } from "@/domain/transactions/transaction.type";
import { isSameTransactionInput } from "@/domain/transactions/transaction.utils";
import {
  chooseEditSizeDriver,
  editFormValuesFromTransaction,
  editNotice,
  movedOutOfScopeHint,
} from "./transaction-edit.utils";
import { EDIT_SHARES_DRIVER_MAX_DECIMALS } from "./transaction-form.constants";
import type { TransactionFormValues } from "./transaction-form.type";
import { buildTransactionInput, positionSizeDisplay } from "./transaction-form.utils";

const TODAY = "2025-06-15";

const STORED_INPUT: TransactionInput = {
  portfolioId: "p-retiro",
  ticker: "AAPL",
  type: "BUY",
  date: "2025-06-10",
  quantity: 1,
  price: 1,
};

function form(overrides: Partial<TransactionFormValues>): TransactionFormValues {
  return {
    portfolioId: "p-retiro",
    type: "BUY",
    ticker: "AAPL",
    date: "2025-06-10",
    price: "",
    sizeField: "amount",
    sizeText: "",
    ...overrides,
  };
}

// Stores an input the way transactions.create does: total unrounded, id and createdAt from the server.
function store(input: TransactionInput): TransactionLike {
  return { ...input, id: "t1", totalAmount: calculateTotalAmount(input.quantity, input.price), createdAt: 1 };
}

function created(values: Partial<TransactionFormValues>): TransactionLike {
  const result = buildTransactionInput(form(values), TODAY);
  if (!result.ok) throw new Error(`expected a valid transaction: ${JSON.stringify(result.fieldErrors)}`);
  return store(result.input);
}

function rebuild(values: TransactionFormValues): TransactionInput {
  const result = buildTransactionInput(values, TODAY);
  if (!result.ok) throw new Error(`expected the edit form to rebuild: ${JSON.stringify(result.fieldErrors)}`);
  return result.input;
}

function fractionDigits(text: string): number {
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : text.length - dot - 1;
}

// Deterministic PRNG (mulberry32) so fuzz failures reproduce.
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(random: () => number, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}

// Plain decimal text with `decimals` digits after the point, e.g. (12345, 2) → "123.45".
function decimalText(units: number, decimals: number): string {
  if (decimals === 0) return String(units);
  const digits = String(units).padStart(decimals + 1, "0");
  return `${digits.slice(0, -decimals)}.${digits.slice(-decimals)}`;
}

describe("chooseEditSizeDriver / editFormValuesFromTransaction", () => {
  it("reopens a hand-typed share count with shares driving", () => {
    const values = editFormValuesFromTransaction(store({ ...STORED_INPUT, quantity: 10, price: 150.25 }));
    expect(values).toMatchObject({ price: "150.25", sizeField: "quantity", sizeText: "10" });
  });

  it("reopens a trade entered as an amount with the amount driving", () => {
    const values = editFormValuesFromTransaction(created({ sizeText: "100", price: "333" }));
    expect(values).toMatchObject({ price: "333.00", sizeField: "amount", sizeText: "100.00" });
  });

  it("keeps shares driving when the cent amount does not reproduce the quantity (3 × 0.1)", () => {
    const transaction = store({ ...STORED_INPUT, quantity: 3, price: 0.1 });
    expect(transaction.totalAmount).toBe(0.30000000000000004);
    expect(editFormValuesFromTransaction(transaction)).toMatchObject({ price: "0.10", sizeField: "quantity", sizeText: "3" });
  });

  it("falls back to the exact long share text when no amount reproduces it", () => {
    expect(chooseEditSizeDriver({ quantity: 0.1234567891, price: 97.13, totalAmount: 0.1234567891 * 97.13 }, "97.13")).toEqual({
      sizeField: "quantity",
      sizeText: "0.1234567891",
    });
  });

  it(`keeps shares driving up to ${EDIT_SHARES_DRIVER_MAX_DECIMALS} decimals`, () => {
    expect(chooseEditSizeDriver({ quantity: 0.123456, price: 97.13, totalAmount: 0.123456 * 97.13 }, "97.13")).toEqual({
      sizeField: "quantity",
      sizeText: "0.123456",
    });
  });

  it("shows the calculated shares of an amount-driven trade like the create form", () => {
    const values = editFormValuesFromTransaction(created({ sizeText: "100", price: "333" }));
    expect(positionSizeDisplay(values).quantity).toBe("0.3003003");
  });
});

describe("R1: an untouched edit form rebuilds the stored transaction exactly", () => {
  function expectExactRoundTrip(transaction: TransactionLike) {
    const input = rebuild(editFormValuesFromTransaction(transaction));
    expect(input.quantity).toBe(transaction.quantity);
    expect(input.price).toBe(transaction.price);
    expect(calculateTotalAmount(input.quantity, input.price)).toBe(transaction.totalAmount);
    expect(isSameTransactionInput(input, transaction)).toBe(true);
  }

  it.each([
    ["75", "333"],
    ["100", "333"],
    ["1234.56", "7"],
    ["50", "210.37"],
  ])("amount $%s at $%s", (amount, price) => {
    expectExactRoundTrip(created({ sizeField: "amount", sizeText: amount, price }));
  });

  it.each([
    ["3.5", "200.15"],
    ["0.0000001", "5"],
    ["1", "0.0000001"],
    ["0.123456789123", "97.13"],
    ["0.000000002", "1000000"],
  ])("%s shares at $%s", (shares, price) => {
    expectExactRoundTrip(created({ sizeField: "quantity", sizeText: shares, price }));
  });

  it("holds for 5k seeded 2-decimal amount/price pairs, with the amount driving whenever the shares are long", () => {
    const random = seededRandom(0x5eed_a307);
    const failures: string[] = [];
    for (let i = 0; i < 5000; i += 1) {
      const amount = decimalText(randomInt(random, 1, 100_000_000), 2);
      const price = decimalText(randomInt(random, 1, 10_000_000), 2);
      const transaction = created({ sizeField: "amount", sizeText: amount, price });
      const values = editFormValuesFromTransaction(transaction);
      const input = rebuild(values);
      const reopensLong = values.sizeField === "quantity" && fractionDigits(values.sizeText) > EDIT_SHARES_DRIVER_MAX_DECIMALS;
      if (!isSameTransactionInput(input, transaction) || reopensLong) failures.push(`$${amount} @ ${price}`);
    }
    expect(failures).toEqual([]);
  });

  it("holds for 5k seeded share/price pairs", () => {
    const random = seededRandom(0x5eed_5a2e);
    const failures: string[] = [];
    for (let i = 0; i < 5000; i += 1) {
      const shareDecimals = randomInt(random, 0, 12);
      const shareUnits = Math.max(1, randomInt(random, 0, 10 ** Math.min(shareDecimals + 4, 15)));
      const shares = decimalText(shareUnits, shareDecimals);
      const priceDecimals = randomInt(random, 0, 4);
      const price = decimalText(randomInt(random, 1, 10 ** (priceDecimals + 4)), priceDecimals);
      const transaction = created({ sizeField: "quantity", sizeText: shares, price });
      if (!isSameTransactionInput(rebuild(editFormValuesFromTransaction(transaction)), transaction)) {
        failures.push(`${shares} @ ${price}`);
      }
    }
    expect(failures).toEqual([]);
  });
});

describe("partial edits keep untouched numbers exact", () => {
  const byAmount = created({ sizeField: "amount", sizeText: "100", price: "333" });
  const byShares = created({ sizeField: "quantity", sizeText: "3.5", price: "200.15" });

  it.each([
    [{ date: "2025-06-01" }],
    [{ ticker: "msft" }],
    [{ type: "SELL" as const }],
    [{ portfolioId: "p-viajes" }],
  ])("changing only %j", (change) => {
    for (const transaction of [byAmount, byShares]) {
      const input = rebuild({ ...editFormValuesFromTransaction(transaction), ...change });
      expect(input.quantity).toBe(transaction.quantity);
      expect(input.price).toBe(transaction.price);
      expect(calculateTotalAmount(input.quantity, input.price)).toBe(transaction.totalAmount);
    }
  });

  it("keeps the exact quantity when shares drive and the price changes", () => {
    const input = rebuild({ ...editFormValuesFromTransaction(byShares), price: "210" });
    expect(input).toMatchObject({ quantity: 3.5, price: 210 });
  });

  it("recalculates amount ÷ new price when the amount drives and the price changes", () => {
    const input = rebuild({ ...editFormValuesFromTransaction(byAmount), price: "250" });
    expect(input).toMatchObject({ quantity: 100 / 250, price: 250 });
  });
});

describe("editNotice", () => {
  const baseline = created({ sizeField: "quantity", sizeText: "10", price: "150.25" });

  it("reports a deletion confirmed by the server", () => {
    expect(editNotice(baseline, baseline, true)).toBe("deleted");
  });

  it("reports a transaction gone from the live list", () => {
    expect(editNotice(baseline, undefined, false)).toBe("deleted");
  });

  it("reports a change made elsewhere", () => {
    expect(editNotice(baseline, { ...baseline, totalAmount: baseline.totalAmount + 1 }, false)).toBe("changed");
  });

  it("stays quiet while the live version is the one the form opened", () => {
    expect(editNotice(baseline, { ...baseline }, false)).toBeNull();
  });
});

describe("movedOutOfScopeHint", () => {
  const retiro = { id: "p-retiro" as Id<"portfolios">, name: "Retiro", createdAt: 1 };
  const viajes = { id: "p-viajes" as Id<"portfolios">, name: "Viajes", createdAt: 2 };
  const portfolios = [retiro, viajes];
  const retiroScope = { kind: "portfolio" as const, portfolioId: retiro.id };

  it("says nothing in the combined view", () => {
    expect(movedOutOfScopeHint({ kind: "all" }, "p-viajes", portfolios)).toBeUndefined();
  });

  it.each([
    ["the same portfolio", "p-retiro"],
    ["no choice", ""],
    ["an unknown portfolio", "p-deleted"],
  ])("says nothing for %s", (_label, chosen) => {
    expect(movedOutOfScopeHint(retiroScope, chosen, portfolios)).toBeUndefined();
  });

  it("warns when the trade moves to another existing portfolio", () => {
    expect(movedOutOfScopeHint(retiroScope, "p-viajes", portfolios)).toBe(
      "After saving, this transaction moves to Viajes and won't be listed while Retiro is selected.",
    );
  });
});
