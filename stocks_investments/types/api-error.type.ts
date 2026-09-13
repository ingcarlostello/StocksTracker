export type ApiErrorCode =
  | "INVALID_SYMBOLS"
  | "RATE_LIMITED"
  | "PRICES_UNAVAILABLE"
  | "CONFIGURATION_ERROR"
  | "UPSTREAM_ERROR"
  | "INTERNAL_ERROR";

export type ApiErrorResponse = {
  error: {
    code: ApiErrorCode;
    message: string;
  };
};
