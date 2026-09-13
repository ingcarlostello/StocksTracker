import type { ApiErrorCode } from "@/types/api-error.type";

export type PricesErrorCode = ApiErrorCode | "NETWORK_ERROR" | "INVALID_RESPONSE";
