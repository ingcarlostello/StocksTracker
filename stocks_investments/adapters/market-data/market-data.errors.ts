import type { MarketDataErrorCode } from "./market-data-provider.type";

export class MarketDataError extends Error {
  readonly code: MarketDataErrorCode;
  readonly status: number | null;

  constructor(code: MarketDataErrorCode, message: string, status: number | null = null) {
    super(message);
    this.name = "MarketDataError";
    this.code = code;
    this.status = status;
  }
}
