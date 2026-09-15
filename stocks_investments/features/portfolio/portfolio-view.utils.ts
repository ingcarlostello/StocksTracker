import type { OversellViolation } from "@/domain/transactions/transaction.type";
import { formatIsoDate } from "@/utils/date-format.utils";
import { formatSharesExact } from "@/utils/number-format.utils";

// Byte-identical to the Phase 7 alert text. Exact share digits, so a difference the table rounds away stays visible.
export function invalidHistoryMessage(violation: OversellViolation): string {
  const { ticker, date, available, requested } = violation;
  return `Your history sells ${formatSharesExact(requested)} ${ticker} on ${formatIsoDate(date)}, but only ${formatSharesExact(available)} shares were held then. Fix that transaction to see your portfolio.`;
}
