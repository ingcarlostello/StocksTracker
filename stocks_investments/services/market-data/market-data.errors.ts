export type PricesRequestErrorCode =
  | "INVALID_SYMBOLS"
  | "INVALID_YEAR"
  | "NO_DATA"
  | "HISTORY_UNAVAILABLE";

export class PricesRequestError extends Error {
  readonly code: PricesRequestErrorCode;
  readonly invalidSymbols: string[];

  constructor(code: PricesRequestErrorCode, message: string, invalidSymbols: string[] = []) {
    super(message);
    this.name = "PricesRequestError";
    this.code = code;
    this.invalidSymbols = invalidSymbols;
  }
}
