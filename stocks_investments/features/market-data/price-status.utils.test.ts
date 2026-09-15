import { describe, expect, it } from "vitest";
import { formatDateTime, formatIsoDate } from "@/utils/date-format.utils";
import { missingClosesMessage, priceStatusLabel } from "./price-status.utils";

const ts = Date.UTC(2026, 8, 15, 14, 24);

// Local copy of the inline ternary PriceStatus rendered before the extraction.
function legacyLabel(isPending: boolean, asOfDate: string | null, lastUpdatedAt: number | null): string {
  return isPending
    ? "Loading prices…"
    : asOfDate
      ? `Close of ${formatIsoDate(asOfDate)}${lastUpdatedAt ? ` · updated ${formatDateTime(lastUpdatedAt)}` : ""}`
      : "Prices not loaded";
}

describe("priceStatusLabel", () => {
  it("shows loading even when a close is known", () => {
    expect(priceStatusLabel({ isPending: true, asOfDate: "2026-09-11", lastUpdatedAt: 1 })).toBe("Loading prices…");
  });

  it("reports prices not loaded without a close", () => {
    expect(priceStatusLabel({ isPending: false, asOfDate: null, lastUpdatedAt: null })).toBe("Prices not loaded");
    expect(priceStatusLabel({ isPending: false, asOfDate: "", lastUpdatedAt: null })).toBe("Prices not loaded");
    expect(priceStatusLabel({ isPending: false, asOfDate: null, lastUpdatedAt: 123 })).toBe("Prices not loaded");
  });

  it("omits the update time for placeholder data", () => {
    expect(priceStatusLabel({ isPending: false, asOfDate: "2026-09-11", lastUpdatedAt: null })).toBe(
      "Close of Sep 11, 2026",
    );
  });

  it("adds the local update time", () => {
    expect(priceStatusLabel({ isPending: false, asOfDate: "2026-09-11", lastUpdatedAt: ts })).toBe(
      `Close of Sep 11, 2026 · updated ${formatDateTime(ts)}`,
    );
  });

  it("shows a non-ISO stored date as stored", () => {
    expect(priceStatusLabel({ isPending: false, asOfDate: "09/11/2026", lastUpdatedAt: null })).toBe(
      "Close of 09/11/2026",
    );
  });

  const cases = [true, false].flatMap((isPending) =>
    [null, "", "2026-09-11"].flatMap((asOfDate) =>
      [null, 0, ts].map((lastUpdatedAt) => ({ isPending, asOfDate, lastUpdatedAt })),
    ),
  );

  it.each(cases)(
    "matches the former inline label (isPending $isPending, asOfDate $asOfDate, lastUpdatedAt $lastUpdatedAt)",
    ({ isPending, asOfDate, lastUpdatedAt }) => {
      expect(priceStatusLabel({ isPending, asOfDate, lastUpdatedAt })).toBe(
        legacyLabel(isPending, asOfDate, lastUpdatedAt),
      );
    },
  );
});

describe("missingClosesMessage", () => {
  it("is null when every ticker has a close", () => {
    expect(missingClosesMessage([])).toBeNull();
  });

  it("names the tickers without a close", () => {
    expect(missingClosesMessage(["ZZZZ"])).toBe("No close available for ZZZZ.");
    expect(missingClosesMessage(["A", "B"])).toBe("No close available for A, B.");
  });
});
