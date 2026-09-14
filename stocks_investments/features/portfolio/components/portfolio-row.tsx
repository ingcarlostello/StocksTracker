import { Pencil, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { PORTFOLIO_NAME_INPUT_MAX_LENGTH } from "../portfolio-form.constants";
import type { PortfolioRowMode } from "../portfolio-management.type";

type PortfolioRowProps = {
  id: string;
  name: string;
  transactionCountLabel: string;
  mode: PortfolioRowMode;
  draftName: string;
  error: string | null;
  isSaving: boolean;
  onStartRename: () => void;
  onDraftNameChange: (value: string) => void;
  onCancel: () => void;
  onSubmitRename: () => void;
  onRequestDelete: () => void;
  onConfirmDelete: () => void;
};

export function PortfolioRow({
  id,
  name,
  transactionCountLabel,
  mode,
  draftName,
  error,
  isSaving,
  onStartRename,
  onDraftNameChange,
  onCancel,
  onSubmitRename,
  onRequestDelete,
  onConfirmDelete,
}: PortfolioRowProps) {
  function handleRenameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmitRename();
  }

  if (mode === "renaming") {
    return (
      <li className="px-4 py-3">
        <form noValidate onSubmit={handleRenameSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex-1">
            <TextField
              id={`rename-portfolio-${id}`}
              label={`New name for ${name}`}
              hideLabel
              autoComplete="off"
              autoFocus
              maxLength={PORTFOLIO_NAME_INPUT_MAX_LENGTH}
              value={draftName}
              error={error ?? undefined}
              onChange={(event) => onDraftNameChange(event.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-3 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{name}</p>
          <p className="text-sm text-muted">{transactionCountLabel}</p>
        </div>
        {mode === "confirming-delete" ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-foreground">Delete this portfolio?</p>
            <Button variant="secondary" onClick={onCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button variant="danger" onClick={onConfirmDelete} disabled={isSaving} aria-label={`Delete ${name}`}>
              {isSaving ? "Deleting…" : "Delete"}
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onStartRename} aria-label={`Rename ${name}`}>
              <Pencil aria-hidden="true" className="size-4" strokeWidth={1.75} />
              Rename
            </Button>
            <Button variant="secondary" onClick={onRequestDelete} aria-label={`Delete ${name}`}>
              <Trash2 aria-hidden="true" className="size-4" strokeWidth={1.75} />
              Delete
            </Button>
          </div>
        )}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-negative">
          {error}
        </p>
      ) : null}
    </li>
  );
}
