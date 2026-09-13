export type CachedClose = {
  ticker: string;
  // null = the date had market data but this ticker had no bar.
  close: number | null;
};

export interface DailyCloseCache {
  getByDate(date: string, tickers: readonly string[]): Promise<CachedClose[]>;
  saveMany(date: string, entries: readonly CachedClose[]): Promise<void>;
}
