import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "../../convex/_generated/api";
import type { CachedClose, DailyCloseCache } from "./daily-close-cache.type";

export class ConvexDailyCloseCache implements DailyCloseCache {
  private readonly url: string;

  constructor(url: string) {
    this.url = url;
  }

  async getByDate(date: string, tickers: readonly string[]): Promise<CachedClose[]> {
    return await fetchQuery(api.dailyCloses.getByDate, { date, tickers: [...tickers] }, { url: this.url });
  }

  async saveMany(date: string, entries: readonly CachedClose[]): Promise<void> {
    await fetchMutation(api.dailyCloses.upsertMany, { date, entries: [...entries] }, { url: this.url });
  }
}
