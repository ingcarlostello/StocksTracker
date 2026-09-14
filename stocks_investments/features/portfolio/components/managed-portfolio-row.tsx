import { usePortfolioRow } from "../hooks/use-portfolio-row.hook";
import { transactionCountLabel } from "../portfolio-management.utils";
import type { PortfolioOption } from "../portfolio-selection.type";
import { PortfolioRow } from "./portfolio-row";

type ManagedPortfolioRowProps = {
  portfolio: PortfolioOption;
  portfolios: readonly PortfolioOption[];
  transactionCount: number;
};

export function ManagedPortfolioRow({ portfolio, portfolios, transactionCount }: ManagedPortfolioRowProps) {
  const row = usePortfolioRow({ portfolio, portfolios, transactionCount });

  return (
    <PortfolioRow
      id={portfolio.id}
      name={portfolio.name}
      transactionCountLabel={transactionCountLabel(transactionCount)}
      mode={row.mode}
      draftName={row.draftName}
      error={row.error}
      isSaving={row.isSaving}
      onStartRename={row.startRename}
      onDraftNameChange={row.changeDraftName}
      onCancel={row.cancel}
      onSubmitRename={() => void row.submitRename()}
      onRequestDelete={row.requestDelete}
      onConfirmDelete={() => void row.confirmDelete()}
    />
  );
}
