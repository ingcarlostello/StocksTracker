import { ConvexError, v, type ObjectType } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
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
  ValidationIssue,
} from "../domain/transactions/transaction.type";
import { toTransactionLike } from "../domain/transactions/transaction.utils";
import { validateSellSequence } from "../domain/portfolio/position.service";
import { todayIsoInTimeZone } from "../utils/date.utils";

const transactionDocValidator = v.object({
  _id: v.id("transactions"),
  _creationTime: v.number(),
  ...transactionFields,
});

function fail(data: TransactionErrorData): never {
  throw new ConvexError(data);
}

type TransactionArgs = ObjectType<typeof transactionInputFields>;

// Domain rules plus the one check only the server can make: the portfolio must exist.
async function validateOrFail(ctx: MutationCtx, args: TransactionArgs): Promise<TransactionArgs> {
  const result = validateTransactionInput(args, todayIsoInTimeZone(MARKET_TIME_ZONE, Date.now()));
  const issues: ValidationIssue[] = result.ok ? [] : [...result.issues];
  if (!(await ctx.db.get("portfolios", args.portfolioId))) {
    issues.unshift({ field: "portfolioId", code: "UNKNOWN_PORTFOLIO" });
  }
  if (!result.ok || issues.length > 0) fail({ code: TRANSACTION_ERROR_CODES.VALIDATION, issues });
  return { ...result.value, portfolioId: args.portfolioId };
}

// Runs after the write: throwing makes Convex discard every write of the mutation.
// Only the (portfolio, ticker) position is replayed; shares are never borrowed from another portfolio.
async function assertNoOversell(ctx: MutationCtx, portfolioId: Id<"portfolios">, ticker: string): Promise<void> {
  const history = await ctx.db
    .query("transactions")
    .withIndex("by_portfolio_ticker_date", (q) => q.eq("portfolioId", portfolioId).eq("ticker", ticker))
    .collect();
  const result = validateSellSequence(history.map(toTransactionLike));
  if (!result.ok) fail({ code: TRANSACTION_ERROR_CODES.OVERSELL, ...result.violation });
}

// Every portfolio's transactions, or only one portfolio's when `portfolioId` is given.
export const list = query({
  args: { portfolioId: v.optional(v.id("portfolios")) },
  returns: v.array(transactionDocValidator),
  handler: async (ctx, { portfolioId }) => {
    if (portfolioId === undefined) {
      return await ctx.db.query("transactions").withIndex("by_date").collect();
    }
    return await ctx.db
      .query("transactions")
      .withIndex("by_portfolio_date", (q) => q.eq("portfolioId", portfolioId))
      .collect();
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
    const input = await validateOrFail(ctx, args);
    const id = await ctx.db.insert("transactions", {
      ...input,
      totalAmount: calculateTotalAmount(input.quantity, input.price),
      createdAt: Date.now(),
    });
    // A new BUY only adds shares, so it cannot create an oversell.
    if (input.type === "SELL") await assertNoOversell(ctx, input.portfolioId, input.ticker);
    return id;
  },
});

export const update = mutation({
  args: { id: v.id("transactions"), ...transactionInputFields },
  returns: v.null(),
  handler: async (ctx, { id, ...fields }) => {
    const existing = await ctx.db.get("transactions", id);
    if (!existing) fail({ code: TRANSACTION_ERROR_CODES.NOT_FOUND, id });
    const input = await validateOrFail(ctx, fields);
    await ctx.db.patch("transactions", id, {
      ...input,
      totalAmount: calculateTotalAmount(input.quantity, input.price),
    });
    await assertNoOversell(ctx, input.portfolioId, input.ticker);
    // Moving a trade to another ticker or portfolio can leave a SELL uncovered in the position it left.
    if (existing.portfolioId !== input.portfolioId || existing.ticker !== input.ticker) {
      await assertNoOversell(ctx, existing.portfolioId, existing.ticker);
    }
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
    // Removing a SELL only adds back shares, so it cannot create an oversell.
    if (existing.type === "BUY") await assertNoOversell(ctx, existing.portfolioId, existing.ticker);
    return null;
  },
});
