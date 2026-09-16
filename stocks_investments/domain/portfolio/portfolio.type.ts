import type { OversellViolation } from "../transactions/transaction.type";
import type { PORTFOLIO_ERROR_CODES } from "./portfolio.constants";

export type Position = {
  ticker: string;
  shares: number;
  // Cost of the shares still held (average cost method).
  costBasis: number;
  // Sum of sale proceeds minus the cost basis removed by each SELL.
  realizedGain: number;
};

export type PositionsResult =
  | { ok: true; positions: Position[] }
  | { ok: false; violation: OversellViolation };

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

// Value of a set of positions at one date's closes; `value` is null while any ticker has no close,
// so a partial valuation is never presented as a total.
export type PositionsValuation = { value: number | null; missingTickers: string[] };

// A named group of transactions ("Retiro", "Viajes"); positions are never shared between portfolios.
// Generic id keeps the storage id type (e.g. a Convex Id) without importing it here.
export type PortfolioLike<TId extends string = string> = {
  id: TId;
  name: string;
  createdAt: number;
};

export type PortfolioNameIssueCode = "EMPTY_NAME" | "NAME_TOO_LONG";

export type PortfolioNameResult =
  | { ok: true; name: string; nameKey: string }
  | { ok: false; code: PortfolioNameIssueCode };

export type PortfolioErrorData =
  | { code: typeof PORTFOLIO_ERROR_CODES.VALIDATION; issue: PortfolioNameIssueCode }
  | { code: typeof PORTFOLIO_ERROR_CODES.DUPLICATE_NAME; name: string }
  | { code: typeof PORTFOLIO_ERROR_CODES.NOT_FOUND; id: string }
  | { code: typeof PORTFOLIO_ERROR_CODES.NOT_EMPTY; id: string };
