// Floor for the Modified Dietz denominator, in dollars. Below half a cent an average capital is float
// residue, not capital: selling 0.1 + 0.2 shares at a $10 close leaves a denominator of 4.4e-16, whose
// rate would read −100.00%. Half a cent is far above any float noise and far below a measurable base.
export const MONEY_EPSILON = 0.005;

export const ANNUAL_PERFORMANCE_STATUSES = [
  "ok",
  "no-activity",
  "awaiting-first-close",
  "missing-begin-price",
  "missing-end-price",
  "undefined-average-capital",
] as const;
