"use client";

import { useId, useRef, type ComponentPropsWithRef, type ReactNode } from "react";
import { useModalDialog } from "@/hooks/use-modal-dialog.hook";
import { Button } from "./button";

type ConfirmDialogProps = {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  pendingLabel: string;
  cancelLabel: string;
  isPending: boolean;
  // false when the action is not possible, leaving only the cancel button (e.g. "Close").
  showConfirm: boolean;
  error: string | null;
  returnFocusId: string;
  fallbackFocusId: string;
  onConfirm: () => void;
  onCancel: () => void;
};

// Native modal <dialog>: the page behind it is inert and Esc maps to onCancel. While the action is pending only the
// confirm button is locked; the dialog can still be closed and the action keeps running.
// Mount it only while it is open; unmounting closes it and returns focus.
export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  pendingLabel,
  cancelLabel,
  isPending,
  showConfirm,
  error,
  returnFocusId,
  fallbackFocusId,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const bodyId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  // Button's props type has no `ref` yet, although React 19 forwards it through its prop spread.
  const cancelRefProps: Pick<ComponentPropsWithRef<"button">, "ref"> = { ref: cancelRef };
  const { ref, handleCancel, handleClose } = useModalDialog({
    onCancel,
    returnFocusId,
    fallbackFocusId,
    initialFocusRef: cancelRef,
  });

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onCancel={handleCancel}
      onClose={handleClose}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-border bg-surface p-6 text-foreground backdrop:bg-black/60"
    >
      <div className="flex flex-col gap-4">
        <h2 id={titleId} className="text-lg font-semibold text-foreground">
          {title}
        </h2>
        <div id={bodyId} className="flex flex-col gap-4 text-sm text-muted">
          {children}
        </div>
        {error ? (
          <p role="alert" className="rounded-md border border-negative/40 bg-sell-tint px-3 py-2 text-sm text-foreground">
            {error}
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap justify-end gap-3">
          <Button {...cancelRefProps} variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          {showConfirm ? (
            <Button variant="danger" disabled={isPending} onClick={onConfirm}>
              {isPending ? pendingLabel : confirmLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}
