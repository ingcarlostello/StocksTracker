import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { transactionFields, transactionInputFields } from "./schema";
import {
  calculateTotalAmount,
  normalizeTicker,
  validateTransactionInput,
} from "../domain/transactions/transaction-validation.service";
import {
  MARKET_TIME_ZONE,
  TRANSACTION_ERROR_CODES,
} from "../domain/transactions/transaction.constants";
import type {
  TransactionErrorData,
  TransactionInput,
} from "../domain/transactions/transaction.type";
import { todayIsoInTimeZone } from "../utils/date.utils";

const transactionDocValidator = v.object({
  _id: v.id("transactions"),
  _creationTime: v.number(),
  ...transactionFields,
});

function fail(data: TransactionErrorData): never {
  throw new ConvexError(data);
}

function validateOrFail(input: TransactionInput): TransactionInput {
  const result = validateTransactionInput(input, todayIsoInTimeZone(MARKET_TIME_ZONE, Date.now()));
  if (!result.ok) fail({ code: TRANSACTION_ERROR_CODES.VALIDATION, issues: result.issues });
  return result.value;
}

export const list = query({
  args: {},
  returns: v.array(transactionDocValidator),
  handler: async (ctx) => {
    return await ctx.db.query("transactions").withIndex("by_date").collect();
  },
});

export const listByTicker = query({
  args: { ticker: v.string() },
  returns: v.array(transactionDocValidator),
  handler: async (ctx, { ticker }) => {
    return await ctx.db
      .query("transactions")
      .withIndex("by_ticker_date", (q) => q.eq("ticker", normalizeTicker(ticker)))
      .collect();
  },
});

export const create = mutation({
  args: transactionInputFields,
  returns: v.id("transactions"),
  handler: async (ctx, args) => {
    const input = validateOrFail(args);
    return await ctx.db.insert("transactions", {
      ...input,
      totalAmount: calculateTotalAmount(input.quantity, input.price),
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: { id: v.id("transactions"), ...transactionInputFields },
  returns: v.null(),
  handler: async (ctx, { id, ...fields }) => {
    const existing = await ctx.db.get("transactions", id);
    if (!existing) fail({ code: TRANSACTION_ERROR_CODES.NOT_FOUND, id });
    const input = validateOrFail(fields);
    await ctx.db.patch("transactions", id, {
      ...input,
      totalAmount: calculateTotalAmount(input.quantity, input.price),
    });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("transactions") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const existing = await ctx.db.get("transactions", id);
    if (!existing) fail({ code: TRANSACTION_ERROR_CODES.NOT_FOUND, id });
    await ctx.db.delete("transactions", id);
    return null;
  },
});
