import { sortTransactions } from "../transactions/transaction-order.service";
import type { TransactionLike } from "../transactions/transaction.type";
import type { CashFlow, CashFlowSummary, ExcludedFlows } from "./performance.type";

// A buy puts money in, a sale takes it out, at the amount the trade was recorded with.
export function toCashFlow(
  transaction: Pick<TransactionLike, "type" | "date" | "totalAmount">,
): CashFlow {
  return {
    date: transaction.date,
    amount: transaction.type === "BUY" ? transaction.totalAmount : -transaction.totalAmount,
  };
}

// Sorts before filtering, like buildPositions: callers are never trusted with the order, because the
// period's start re-base reads flows[0] and an unsorted array would re-base the year to the wrong date.
export function cashFlowsInPeriod(
  transactions: readonly TransactionLike[],
  start: string,
  endExclusive: string,
): CashFlow[] {
  return sortTransactions(transactions)
    .filter((transaction) => transaction.date >= start && transaction.date < endExclusive)
    .map(toCashFlow);
}

// Trades of the year that the measured period leaves out; sorted too, because firstDate is the earliest.
export function flowsAfter(
  transactions: readonly TransactionLike[],
  fromInclusive: string,
  throughInclusive: string,
): ExcludedFlows {
  const flows = sortTransactions(transactions)
    .filter(
      (transaction) =>
        transaction.date >= fromInclusive && transaction.date <= throughInclusive,
    )
    .map(toCashFlow);

  return {
    count: flows.length,
    firstDate: flows.length > 0 ? flows[0].date : null,
    net: flows.reduce((total, flow) => total + flow.amount, 0),
  };
}

export function summarizeCashFlows(flows: readonly CashFlow[]): CashFlowSummary {
  let contributions = 0;
  let withdrawals = 0;

  for (const flow of flows) {
    if (flow.amount >= 0) contributions += flow.amount;
    else withdrawals -= flow.amount;
  }

  return { contributions, withdrawals, net: contributions - withdrawals };
}
