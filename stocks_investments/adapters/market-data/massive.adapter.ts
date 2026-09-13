import { MarketDataError } from "./market-data.errors";
import type {
  DailyClosesSnapshot,
  MarketDataErrorCode,
  MarketDataProvider,
} from "./market-data-provider.type";
import {
  MASSIVE_BASE_URL,
  MASSIVE_GROUPED_DAILY_PATH,
  MASSIVE_REQUEST_TIMEOUT_MS,
} from "./massive.constants";
import type { GroupedDailyResponse, MassiveErrorResponse } from "./massive.type";

type MassiveProviderOptions = {
  apiKey: string;
  fetchImpl?: typeof fetch;
  baseUrl?: string;
  timeoutMs?: number;
};

function errorCodeForStatus(status: number): MarketDataErrorCode {
  if (status === 429) return "RATE_LIMITED";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "NOT_ENTITLED";
  if (status === 400) return "BAD_REQUEST";
  return "UPSTREAM_ERROR";
}

// Error bodies are not guaranteed to be JSON; callers still act on the HTTP status.
async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isGroupedDailyResponse(body: unknown): body is GroupedDailyResponse {
  if (typeof body !== "object" || body === null) return false;
  const { status, results } = body as GroupedDailyResponse;
  return status === "OK" && (results === undefined || Array.isArray(results));
}

export class MassiveMarketDataProvider implements MarketDataProvider {
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor({ apiKey, fetchImpl = fetch, baseUrl = MASSIVE_BASE_URL, timeoutMs = MASSIVE_REQUEST_TIMEOUT_MS }: MassiveProviderOptions) {
    this.apiKey = apiKey;
    this.fetchImpl = fetchImpl;
    this.baseUrl = baseUrl;
    this.timeoutMs = timeoutMs;
  }

  async getDailyCloses(date: string, symbols: readonly string[]): Promise<DailyClosesSnapshot> {
    // adjusted=false: closes must match the unadjusted prices the user enters manually.
    const url = `${this.baseUrl}${MASSIVE_GROUPED_DAILY_PATH}/${encodeURIComponent(date)}?adjusted=false`;

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        cache: "no-store",
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new MarketDataError("NETWORK_ERROR", `Massive request failed: ${reason}`);
    }

    const body = await readJson(response);

    if (!response.ok) {
      const detail = (body as MassiveErrorResponse | null)?.error ?? (body as MassiveErrorResponse | null)?.message;
      throw new MarketDataError(
        errorCodeForStatus(response.status),
        `Massive responded ${response.status}${detail ? `: ${detail}` : ""}`,
        response.status,
      );
    }

    if (!isGroupedDailyResponse(body)) {
      throw new MarketDataError("INVALID_RESPONSE", "Massive returned an unexpected grouped daily payload", response.status);
    }

    const results = body.results ?? [];
    const wanted = new Set(symbols);
    const closes: Record<string, number> = {};
    for (const bar of results) {
      if (wanted.has(bar.T) && Number.isFinite(bar.c) && bar.c > 0) closes[bar.T] = bar.c;
    }

    return { date, hasData: results.length > 0, closes };
  }
}
