import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const transactionTypeValidator = v.union(v.literal("BUY"), v.literal("SELL"));

export const portfolioFields = {
  // Display name as entered, trimmed and with inner whitespace collapsed.
  name: v.string(),
  // Lowercased name; unique across portfolios.
  nameKey: v.string(),
  createdAt: v.number(),
};

export const transactionInputFields = {
  portfolioId: v.id("portfolios"),
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
  portfolios: defineTable(portfolioFields).index("by_name_key", ["nameKey"]),

  transactions: defineTable(transactionFields)
    .index("by_date", ["date"])
    .index("by_ticker_date", ["ticker", "date"])
    .index("by_portfolio_date", ["portfolioId", "date"])
    // Replay of one position for oversell checks: average cost never crosses portfolios.
    .index("by_portfolio_ticker_date", ["portfolioId", "ticker", "date"]),

  // Write-once cache of end-of-day closes; a published close never changes.
  dailyCloses: defineTable({
    ticker: v.string(),
    // Actual trading day "YYYY-MM-DD".
    date: v.string(),
    close: dailyCloseValueValidator,
    fetchedAt: v.number(),
  }).index("by_date_ticker", ["date", "ticker"]),
});
