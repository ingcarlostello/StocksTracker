import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const transactionTypeValidator = v.union(v.literal("BUY"), v.literal("SELL"));

export const transactionInputFields = {
  ticker: v.string(),
  type: transactionTypeValidator,
  // "YYYY-MM-DD" trade date, no time or zone.
  date: v.string(),
  quantity: v.number(),
  price: v.number(),
};

export const transactionFields = {
  ...transactionInputFields,
  totalAmount: v.number(),
  // Epoch ms set on create and never changed; orders same-day trades.
  createdAt: v.number(),
};

export default defineSchema({
  transactions: defineTable(transactionFields)
    .index("by_date", ["date"])
    .index("by_ticker_date", ["ticker", "date"]),
});
