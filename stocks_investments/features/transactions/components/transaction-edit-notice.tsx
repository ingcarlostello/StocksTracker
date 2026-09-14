import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { EditNoticeKind } from "../transaction-edit.type";
import { TRANSACTION_EDIT_MESSAGES } from "../transaction-messages.constants";

type TransactionEditNoticeProps = {
  kind: EditNoticeKind;
  onReload: () => void;
  backHref: string;
};

// Saving is disabled while this is shown; the draft stays visible so nothing typed disappears by surprise.
export function TransactionEditNotice({ kind, onReload, backHref }: TransactionEditNoticeProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-md border border-negative/40 bg-sell-tint px-3 py-3 text-sm text-foreground"
    >
      {kind === "changed" ? (
        <>
          <p>{TRANSACTION_EDIT_MESSAGES.CHANGED_ELSEWHERE}</p>
          <Button variant="outline-accent" onClick={onReload}>
            {TRANSACTION_EDIT_MESSAGES.LOAD_LATEST}
          </Button>
        </>
      ) : (
        <>
          <p>{TRANSACTION_EDIT_MESSAGES.DELETED_ELSEWHERE}</p>
          <ButtonLink href={backHref} variant="secondary">
            {TRANSACTION_EDIT_MESSAGES.BACK}
          </ButtonLink>
        </>
      )}
    </div>
  );
}

type TransactionNotFoundNoticeProps = {
  backHref: string;
};

export function TransactionNotFoundNotice({ backHref }: TransactionNotFoundNoticeProps) {
  return (
    <Card className="flex max-w-xl flex-col items-start gap-4">
      <p className="text-sm text-muted">{TRANSACTION_EDIT_MESSAGES.NOT_FOUND_PAGE}</p>
      <ButtonLink href={backHref} variant="secondary">
        {TRANSACTION_EDIT_MESSAGES.BACK}
      </ButtonLink>
    </Card>
  );
}
