import type { API_ERROR_CODES } from "@/constants/api.constants";

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export type ApiErrorResponse = {
  error: {
    code: ApiErrorCode;
    message: string;
  };
};
