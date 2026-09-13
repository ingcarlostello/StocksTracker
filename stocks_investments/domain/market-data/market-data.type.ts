export type SymbolNormalization = {
  // Unique, uppercase, valid tickers in first-seen order.
  symbols: string[];
  // Raw inputs that are not valid tickers after normalization.
  invalid: string[];
};
