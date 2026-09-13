import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { dailyCloseValueValidator } from "./schema";
import { MAX_SYMBOLS_PER_REQUEST } from "../domain/market-data/market-data.constants";
import { normalizeSymbols } from "../domain/market-data/symbol.service";
import { normalizeTicker } from "../domain/transactions/transaction-validation.service";
import { isIsoDate } from "../utils/date.utils";

type DailyCloseErrorData = {
  code: "VALIDATION";
  field: "date" | "tickers" | "close";
  detail: string;
};

function fail(data: DailyCloseErrorData): never {
  throw new ConvexError(data);
}

function validDateOrFail(date: string): string {
  if (!isIsoDate(date)) fail({ code: "VALIDATION", field: "date", detail: date });
  return date;
}

function validTickersOrFail(tickers: readonly string[]): string[] {
  const { symbols, invalid } = normalizeSymbols(tickers);
  if (invalid.length > 0) fail({ code: "VALIDATION", field: "tickers", detail: invalid.join(",") });
  if (symbols.length > MAX_SYMBOLS_PER_REQUEST) {
    fail({ code: "VALIDATION", field: "tickers", detail: `more than ${MAX_SYMBOLS_PER_REQUEST}` });
  }
  return symbols;
}

export const getByDate = query({
  args: { date: v.string(), tickers: v.array(v.string()) },
  returns: v.array(v.object({ ticker: v.string(), close: dailyCloseValueValidator })),
  handler: async (ctx, args) => {
    const date = validDateOrFail(args.date);
    const cached = [];
    for (const ticker of validTickersOrFail(args.tickers)) {
      const row = await ctx.db
        .query("dailyCloses")
        .withIndex("by_date_ticker", (q) => q.eq("date", date).eq("ticker", ticker))
        .unique();
      if (row) cached.push({ ticker: row.ticker, close: row.close });
    }
    return cached;
  },
});

export const upsertMany = mutation({
  args: {
    date: v.string(),
    entries: v.array(v.object({ ticker: v.string(), close: dailyCloseValueValidator })),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const date = validDateOrFail(args.date);
    const tickers = validTickersOrFail(args.entries.map((entry) => entry.ticker));
    const closes = new Map(args.entries.map((entry) => [normalizeTicker(entry.ticker), entry.close]));

    for (const ticker of tickers) {
      const close = closes.get(ticker) ?? null;
      if (close !== null && !(Number.isFinite(close) && close > 0)) {
        fail({ code: "VALIDATION", field: "close", detail: `${ticker}=${close}` });
      }
      const existing = await ctx.db
        .query("dailyCloses")
        .withIndex("by_date_ticker", (q) => q.eq("date", date).eq("ticker", ticker))
        .unique();
      // Write-once: a stored close for (date, ticker) is never overwritten.
      if (!existing) {
        await ctx.db.insert("dailyCloses", { ticker, date, close, fetchedAt: Date.now() });
      }
    }
    return null;
  },
});
