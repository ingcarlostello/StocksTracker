"use client";

import { MoreHorizontal, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useAnchoredPopover } from "@/hooks/use-anchored-popover.hook";

type RowActionBase = {
  label: string;
  // Names the row too ("Edit Buy 10.0000 AAPL…"), since every row repeats the same visible labels.
  ariaLabel: string;
  icon: LucideIcon;
};

export type RowAction =
  | (RowActionBase & { kind: "link"; href: string })
  | (RowActionBase & { kind: "button"; tone?: "danger"; onSelect: (triggerId: string) => void });

type RowActionsMenuProps = {
  // Unique per row; the trigger and panel ids derive from it.
  id: string;
  label: string;
  items: readonly RowAction[];
  // Only decides whether the panel opens below or above the trigger; derived from the item count when omitted.
  estimatedPanelHeight?: number;
};

const ITEM_ESTIMATED_HEIGHT = 40;
const PANEL_VERTICAL_PADDING = 16;

const ITEM_CLASSES =
  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left whitespace-nowrap hover:bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary";

export function RowActionsMenu({ id, label, items, estimatedPanelHeight }: RowActionsMenuProps) {
  const triggerId = `${id}-trigger`;
  const panelId = `${id}-menu`;
  const { triggerRef, panelRef, onBeforeToggle, onToggle } = useAnchoredPopover(
    estimatedPanelHeight ?? items.length * ITEM_ESTIMATED_HEIGHT + PANEL_VERTICAL_PADDING,
  );

  function handleSelect(onSelect: (triggerId: string) => void) {
    // Hiding first returns focus to the trigger, so whatever onSelect opens can hand focus back to it.
    panelRef.current?.hidePopover();
    onSelect(triggerId);
  }

  return (
    <>
      <button
        id={triggerId}
        ref={triggerRef}
        type="button"
        popoverTarget={panelId}
        aria-label={label}
        className="inline-flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-raised hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <MoreHorizontal aria-hidden="true" className="size-4" strokeWidth={1.75} />
      </button>
      {/* Right after the trigger in the DOM, so Tab moves from the trigger into the open panel. */}
      <div
        id={panelId}
        ref={panelRef}
        popover="auto"
        onBeforeToggle={onBeforeToggle}
        onToggle={onToggle}
        className="fixed m-0 min-w-36 rounded-lg border border-border bg-surface-raised p-1 text-sm text-foreground shadow-lg shadow-black/40 [inset:auto]"
      >
        <ul className="flex flex-col">
          {items.map((item) => {
            const Icon = item.icon;
            const content = (
              <>
                <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
                {item.label}
              </>
            );
            return (
              <li key={item.label}>
                {item.kind === "link" ? (
                  <Link href={item.href} aria-label={item.ariaLabel} className={ITEM_CLASSES}>
                    {content}
                  </Link>
                ) : (
                  <button
                    type="button"
                    aria-label={item.ariaLabel}
                    onClick={() => handleSelect(item.onSelect)}
                    className={`${ITEM_CLASSES} ${item.tone === "danger" ? "text-negative" : ""}`}
                  >
                    {content}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
