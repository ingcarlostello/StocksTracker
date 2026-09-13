export type GroupedDailyBar = {
  T: string;
  c: number;
  o?: number;
  h?: number;
  l?: number;
  v?: number;
  vw?: number;
  n?: number;
  t?: number;
};

// Non-trading days return status "OK" with resultsCount 0 and no `results` key.
export type GroupedDailyResponse = {
  status: string;
  resultsCount?: number;
  queryCount?: number;
  adjusted?: boolean;
  request_id?: string;
  results?: GroupedDailyBar[];
};

// 401/400/429 bodies use `error`; 403 (plan entitlement) uses `message`.
export type MassiveErrorResponse = {
  status?: string;
  request_id?: string;
  error?: string;
  message?: string;
};
