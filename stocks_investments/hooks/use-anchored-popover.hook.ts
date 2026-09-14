import { useEffect, useRef, useState, type ToggleEvent } from "react";
import { anchoredPanelPlacement } from "@/utils/popover-position.utils";

function toCssLength(value: number | null): string {
  return value === null ? "auto" : `${value}px`;
}

// Places a `popover="auto"` panel next to its trigger with position: fixed, so it does not depend on
// CSS anchor positioning support. The panel closes on scroll or resize instead of drifting away.
export function useAnchoredPopover(estimatedHeight: number) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  function onBeforeToggle(event: ToggleEvent<HTMLDivElement>) {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (event.newState !== "open" || !trigger || !panel) return;
    // The panel is still display: none here, so its real height is unknown; the estimate decides the side.
    const placement = anchoredPanelPlacement(
      trigger.getBoundingClientRect(),
      // The area position: fixed offsets are measured against: excludes classic scrollbars, unlike innerWidth.
      { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight },
      estimatedHeight,
    );
    panel.style.top = toCssLength(placement.top);
    panel.style.bottom = toCssLength(placement.bottom);
    panel.style.right = toCssLength(placement.right);
  }

  function onToggle(event: ToggleEvent<HTMLDivElement>) {
    setIsOpen(event.newState === "open");
  }

  useEffect(() => {
    if (!isOpen) return;
    const close = () => panelRef.current?.hidePopover();
    const options = { capture: true, passive: true } as const;
    window.addEventListener("scroll", close, options);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, options);
      window.removeEventListener("resize", close);
    };
  }, [isOpen]);

  return { triggerRef, panelRef, onBeforeToggle, onToggle };
}
