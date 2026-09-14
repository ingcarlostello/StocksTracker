import { describe, expect, it } from "vitest";
import { anchoredPanelPlacement } from "./popover-position.utils";

const VIEWPORT = { width: 1200, height: 800 };
const PANEL_HEIGHT = 96;

describe("anchoredPanelPlacement", () => {
  it("places the panel below the trigger, right-aligned with it", () => {
    expect(anchoredPanelPlacement({ top: 100, bottom: 132, right: 1100 }, VIEWPORT, PANEL_HEIGHT)).toEqual({
      top: 136,
      bottom: null,
      right: 100,
    });
  });

  it("still fits below when the panel ends exactly at the bottom margin", () => {
    // 700 + 4 + 88 = 792 = 800 - 8
    expect(anchoredPanelPlacement({ top: 668, bottom: 700, right: 1100 }, VIEWPORT, 88)).toMatchObject({
      top: 704,
      bottom: null,
    });
  });

  it("flips above the trigger near the bottom of the viewport", () => {
    expect(anchoredPanelPlacement({ top: 740, bottom: 772, right: 1100 }, VIEWPORT, PANEL_HEIGHT)).toEqual({
      top: null,
      bottom: 64,
      right: 100,
    });
  });

  it("pins the panel inside the margin when neither side has room", () => {
    const viewport = { width: 400, height: 150 };
    expect(anchoredPanelPlacement({ top: 50, bottom: 82, right: 380 }, viewport, PANEL_HEIGHT)).toEqual({
      top: 46,
      bottom: null,
      right: 20,
    });
  });

  it("never places the top above the margin for a panel taller than the viewport", () => {
    const viewport = { width: 400, height: 90 };
    expect(anchoredPanelPlacement({ top: 30, bottom: 60, right: 380 }, viewport, PANEL_HEIGHT).top).toBe(8);
  });

  it("clamps right to the margin when the trigger sits at the right edge", () => {
    expect(anchoredPanelPlacement({ top: 100, bottom: 132, right: 1198 }, VIEWPORT, PANEL_HEIGHT).right).toBe(8);
  });

  it("uses custom gap and margin", () => {
    expect(anchoredPanelPlacement({ top: 100, bottom: 132, right: 1100 }, VIEWPORT, PANEL_HEIGHT, 10, 20)).toEqual({
      top: 142,
      bottom: null,
      right: 100,
    });
  });
});
