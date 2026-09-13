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

// null = the day's market data was fetched and this ticker had no bar (delisted or unknown).
export const dailyCloseValueValidator = v.union(v.number(), v.null());

export default defineSchema({
  transactions: defineTable(transactionFields)
    .index("by_date", ["date"])
    .index("by_ticker_date", ["ticker", "date"]),

  // Write-once cache of end-of-day closes; a published close never changes.
  dailyCloses: defineTable({
    ticker: v.string(),
    // Actual trading day "YYYY-MM-DD".
    date: v.string(),
    close: dailyCloseValueValidator,
    fetchedAt: v.number(),
  }).index("by_date_ticker", ["date", "ticker"]),
});
