import { useMemo, useRef, useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { findRemovalOversell } from "@/domain/portfolio/position.service";
import type { TransactionLike } from "@/domain/transactions/transaction.type";
import { portfolioNamesById } from "@/features/portfolio/portfolio-list.utils";
import type { PortfolioOption } from "@/features/portfolio/portfolio-selection.type";
import { editTransactionHref } from "../transaction-list-query.utils";
import type { DeleteDialogModel } from "../transaction-list.type";
import { transactionSummary } from "../transaction-list.utils";
import { TRANSACTION_ERROR_MESSAGES, TRANSACTION_LIST_MESSAGES } from "../transaction-messages.constants";
import { describeOversell } from "../transaction-oversell-message.utils";
import { useTransactionMutations } from "./use-transaction-mutations.hook";

type StoredTransaction = TransactionLike<Id<"transactions">>;

type UseDeleteTransactionOptions = {
  // The whole scope, unfiltered: it always contains every trade of the target's (portfolio, ticker) position.
  transactions: readonly StoredTransaction[];
  portfolios: readonly PortfolioOption[];
  // Carried to "Edit that sale" so the edit page returns to the same filtered list.
  listQueryString: string;
};

// Delete confirmation flow of the transactions list. The dialog state is derived from the live data,
// so a BUY that became blocked (or unblocked) elsewhere updates before the user confirms.
// A deletion keeps running if the dialog is closed while it is pending (e.g. offline).
export function useDeleteTransaction({ transactions, portfolios, listQueryString }: UseDeleteTransactionOptions) {
  const { removeTransaction } = useTransactionMutations();
  const [targetId, setTargetId] = useState<string | null>(null);
  const [returnFocusId, setReturnFocusId] = useState("");
  // The deletion in flight, shown while its dialog is open so the row disappearing never flashes "missing".
  const [pending, setPending] = useState<StoredTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const lockRef = useRef(false);
  // Mirrors of state for the awaited confirm(): which dialog is open now, and where its focus returns.
  const openTargetRef = useRef<string | null>(null);
  const pendingReturnFocusRef = useRef("");

  const portfolioNames = useMemo(() => portfolioNamesById(portfolios), [portfolios]);
  const live = useMemo(
    () => (targetId === null ? undefined : transactions.find((transaction) => transaction.id === targetId)),
    [targetId, transactions],
  );

  const dialog = useMemo((): DeleteDialogModel | null => {
    if (targetId === null) return null;
    if (pending && pending.id === targetId) {
      return { kind: "deleting", summary: transactionSummary(pending, portfolioNames), returnFocusId };
    }
    if (!live) return { kind: "missing", returnFocusId };

    const summary = transactionSummary(live, portfolioNames);
    const violation = findRemovalOversell(transactions, live);
    if (violation) {
      return {
        kind: "blocked",
        summary,
        message: describeOversell(violation, { action: "remove", target: live }, portfolios),
        saleEditHref: editTransactionHref(violation.transactionId, listQueryString),
        returnFocusId,
      };
    }
    return { kind: "confirm", summary, error, returnFocusId };
  }, [targetId, pending, live, transactions, portfolios, portfolioNames, listQueryString, error, returnFocusId]);

  function open(id: string, triggerId: string) {
    openTargetRef.current = id;
    setTargetId(id);
    setReturnFocusId(triggerId);
  }

  function close() {
    openTargetRef.current = null;
    setTargetId(null);
    setError(null);
  }

  function requestDelete(id: string, triggerId: string) {
    open(id, triggerId);
    setError(null);
    setStatusMessage("");
  }

  async function confirm() {
    if (dialog?.kind !== "confirm" || !live) return;
    if (lockRef.current) {
      setError(TRANSACTION_LIST_MESSAGES.DELETE_WAIT);
      return;
    }
    const target = live;
    lockRef.current = true;
    pendingReturnFocusRef.current = returnFocusId;
    setPending(target);
    setError(null);

    const result = await removeTransaction(target.id);
    lockRef.current = false;
    setPending(null);
    const isOpenOnTarget = openTargetRef.current === target.id;

    if (result.ok || result.error.kind === "not-found") {
      if (isOpenOnTarget) close();
      setStatusMessage(result.ok ? TRANSACTION_LIST_MESSAGES.DELETED_STATUS : TRANSACTION_LIST_MESSAGES.ALREADY_DELETED);
      return;
    }

    const message =
      result.error.kind === "oversell"
        ? // A BUY was sold from elsewhere after the pre-check; the live data soon turns the dialog into "blocked".
          describeOversell(result.error.violation, { action: "remove", target }, portfolios)
        : TRANSACTION_ERROR_MESSAGES.DELETE_UNEXPECTED;
    if (isOpenOnTarget) {
      setError(message);
    } else if (openTargetRef.current === null) {
      // The dialog was closed while deleting: reopen it so the failure is not missed.
      open(target.id, pendingReturnFocusRef.current);
      setError(message);
    } else {
      // Another row's dialog is open; do not take it over.
      setStatusMessage(message);
    }
  }

  return { dialog, statusMessage, requestDelete, cancel: close, confirm };
}
