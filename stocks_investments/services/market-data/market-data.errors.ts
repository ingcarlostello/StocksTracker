export type PricesRequestErrorCode = "INVALID_SYMBOLS" | "NO_DATA";

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
