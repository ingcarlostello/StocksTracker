type AnchorRect = { top: number; bottom: number; right: number };

// Viewport distances for a `position: fixed` panel; exactly one of top and bottom is set.
type PanelPlacement = { top: number | null; bottom: number | null; right: number };

// Right-aligns a panel with its trigger, below it when it fits, above it otherwise,
// and pinned inside the viewport margin when neither side has room.
export function anchoredPanelPlacement(
  trigger: AnchorRect,
  viewport: { width: number; height: number },
  panelHeight: number,
  gap = 4,
  margin = 8,
): PanelPlacement {
  const right = Math.max(margin, viewport.width - trigger.right);

  if (trigger.bottom + gap + panelHeight <= viewport.height - margin) {
    return { top: trigger.bottom + gap, bottom: null, right };
  }
  if (trigger.top - gap - panelHeight >= margin) {
    return { top: null, bottom: viewport.height - trigger.top + gap, right };
  }
  return { top: Math.max(margin, viewport.height - margin - panelHeight), bottom: null, right };
}
