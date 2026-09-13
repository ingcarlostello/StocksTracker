export type DailyClosesSnapshot = {
  date: string;
  // false when the market published no bars for the date (weekend or holiday).
  hasData: boolean;
  // Close per requested symbol; symbols without a bar that day are absent.
  closes: Record<string, number>;
};

export interface MarketDataProvider {
  getDailyCloses(date: string, symbols: readonly string[]): Promise<DailyClosesSnapshot>;
}

export type MarketDataErrorCode =
  | "RATE_LIMITED"
  | "UNAUTHORIZED"
  | "NOT_ENTITLED"
  | "BAD_REQUEST"
  | "UPSTREAM_ERROR"
  | "INVALID_RESPONSE"
  | "NETWORK_ERROR";
