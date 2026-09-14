import { useEffect, useRef, type RefObject, type SyntheticEvent } from "react";

type UseModalDialogOptions = {
  onCancel: () => void;
  // Element focused when the dialog unmounts; `fallbackFocusId` is used when it no longer exists.
  returnFocusId: string;
  fallbackFocusId: string;
  initialFocusRef: RefObject<HTMLElement | null>;
};

// Syncs a native <dialog> that is mounted only while open: showModal on mount, close and focus return on unmount.
// DOM sync only; the open state itself belongs to the caller.
export function useModalDialog({
  onCancel,
  returnFocusId,
  fallbackFocusId,
  initialFocusRef,
}: UseModalDialogOptions) {
  const ref = useRef<HTMLDialogElement>(null);
  const unmountingRef = useRef(false);
  // Read by the unmount cleanup, which must see the latest ids rather than the ones from mount.
  const focusTargetsRef = useRef({ returnFocusId, fallbackFocusId });

  useEffect(() => {
    focusTargetsRef.current = { returnFocusId, fallbackFocusId };
  }, [returnFocusId, fallbackFocusId]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    unmountingRef.current = false;
    dialog.showModal();
    initialFocusRef.current?.focus();

    return () => {
      unmountingRef.current = true;
      if (dialog.open) dialog.close();
      const { returnFocusId: returnId, fallbackFocusId: fallbackId } = focusTargetsRef.current;
      const returnTarget = document.getElementById(returnId);
      const focusTarget = returnTarget?.isConnected ? returnTarget : document.getElementById(fallbackId);
      focusTarget?.focus();
    };
  }, [initialFocusRef]);

  // Esc: the caller decides whether the dialog closes. Dismissal is never blocked: an action can stay pending
  // for a long time (the Convex client queues mutations while offline), and the page behind is inert.
  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
    onCancel();
  }

  // A close the page did not ask for, such as Chrome closing on a repeated Esc without a cancelable event.
  function handleClose() {
    // `close` fires in a later task: ignore the one queued by our own cleanup, also after a Strict Mode remount.
    if (unmountingRef.current || ref.current?.open) return;
    onCancel();
  }

  return { ref, handleCancel, handleClose };
}
