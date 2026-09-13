import type { PricesErrorCode } from "./prices.type";

export class PricesApiError extends Error {
  readonly code: PricesErrorCode;
  readonly status: number | null;
  readonly retryAfterSeconds: number | null;

  constructor(
    code: PricesErrorCode,
    message: string,
    status: number | null = null,
    retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = "PricesApiError";
    this.code = code;
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
