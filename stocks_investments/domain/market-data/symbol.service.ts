import { TICKER_REGEX } from "../transactions/transaction.constants";
import { normalizeTicker } from "../transactions/transaction-validation.service";
import type { SymbolNormalization } from "./market-data.type";

export function normalizeSymbols(rawSymbols: readonly string[]): SymbolNormalization {
  const symbols: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  for (const raw of rawSymbols) {
    const symbol = normalizeTicker(raw);
    if (!TICKER_REGEX.test(symbol)) {
      invalid.push(raw);
    } else if (!seen.has(symbol)) {
      seen.add(symbol);
      symbols.push(symbol);
    }
  }

  return { symbols, invalid };
}
