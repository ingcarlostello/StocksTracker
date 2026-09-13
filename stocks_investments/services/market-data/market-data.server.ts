import "server-only";
import { ConvexDailyCloseCache } from "@/adapters/convex/daily-close-cache.adapter";
import { MassiveMarketDataProvider } from "@/adapters/market-data/massive.adapter";
import { getConvexUrl, getMassiveApiKey } from "@/lib/env.server";
import { createMarketDataService, type MarketDataService } from "./market-data.service";

let service: MarketDataService | null = null;

// One instance per server process, so the non-trading-date memo survives across requests.
export function getMarketDataService(): MarketDataService {
  if (!service) {
    service = createMarketDataService({
      provider: new MassiveMarketDataProvider({ apiKey: getMassiveApiKey() }),
      cache: new ConvexDailyCloseCache(getConvexUrl()),
      now: Date.now,
    });
  }
  return service;
}
