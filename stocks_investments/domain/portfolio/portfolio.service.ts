import { SHARES_EPSILON } from "./portfolio.constants";
import type { Holding, PortfolioSummary, Position, PriceMap } from "./portfolio.type";

function isOpen(position: Position): boolean {
  return position.shares > SHARES_EPSILON;
}

function openAverageCost(position: Position): number {
  return position.costBasis / position.shares;
}

export function totalShares(position: Position): number {
  return position.shares;
}

export function totalInvested(position: Position): number {
  return position.costBasis;
}

export function averageCost(position: Position): number | null {
  return isOpen(position) ? openAverageCost(position) : null;
}

export function currentValue(position: Position, price: number): number {
  return position.shares * price;
}

export function gainLoss(position: Position, price: number): number {
  return currentValue(position, price) - position.costBasis;
}

export function returnPercentage(position: Position, price: number): number | null {
  return position.costBasis > 0 ? gainLoss(position, price) / position.costBasis : null;
}

function priceFor(prices: PriceMap, ticker: string): number | null {
  return Object.hasOwn(prices, ticker) ? prices[ticker] : null;
}

// Closed positions (no shares left) are not holdings.
export function openPositions(positions: readonly Position[]): Position[] {
  return positions.filter(isOpen);
}

export function buildHoldings(positions: readonly Position[], prices: PriceMap): Holding[] {
  return openPositions(positions).map((position) => {
    const price = priceFor(prices, position.ticker);
    return {
      ticker: position.ticker,
      shares: totalShares(position),
      averageCost: openAverageCost(position),
      totalInvested: totalInvested(position),
      currentPrice: price,
      marketValue: price === null ? null : currentValue(position, price),
      gainLoss: price === null ? null : gainLoss(position, price),
      returnPercentage: price === null ? null : returnPercentage(position, price),
    };
  });
}

// Total Gain/Loss is unrealized only: Portfolio Value − Total Invested.
export function summarizePortfolio(holdings: readonly Holding[]): PortfolioSummary {
  const invested = holdings.reduce((sum, holding) => sum + holding.totalInvested, 0);
  const missingPriceTickers = holdings
    .filter((holding) => holding.marketValue === null)
    .map((holding) => holding.ticker);

  if (missingPriceTickers.length > 0) {
    return {
      portfolioValue: null,
      totalInvested: invested,
      totalGainLoss: null,
      portfolioReturn: null,
      missingPriceTickers,
    };
  }

  const value = holdings.reduce((sum, holding) => sum + (holding.marketValue ?? 0), 0);
  const gain = value - invested;
  return {
    portfolioValue: value,
    totalInvested: invested,
    totalGainLoss: gain,
    portfolioReturn: invested > 0 ? gain / invested : null,
    missingPriceTickers,
  };
}
