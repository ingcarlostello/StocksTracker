export type Position = {
  ticker: string;
  shares: number;
  // Cost of the shares still held.
  costBasis: number;
};

// Latest price per ticker; a missing key means no price is available.
export type PriceMap = Readonly<Record<string, number>>;

export type Holding = {
  ticker: string;
  shares: number;
  averageCost: number;
  totalInvested: number;
  currentPrice: number | null;
  marketValue: number | null;
  gainLoss: number | null;
  // Ratio (0.3333 = 33.33%), not a percentage number.
  returnPercentage: number | null;
};

export type PortfolioSummary = {
  // null while any holding has no price, so totals never mix priced and unpriced rows.
  portfolioValue: number | null;
  totalInvested: number;
  totalGainLoss: number | null;
  portfolioReturn: number | null;
  missingPriceTickers: string[];
};
