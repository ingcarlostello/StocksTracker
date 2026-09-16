import { describe, expect, it } from "vitest";
import { dayIndex } from "../../utils/date.utils";
import { formatSignedPercent } from "../../utils/number-format.utils";
import { averageCapital, flowWeight, modifiedDietz } from "./modified-dietz.service";
import type { ModifiedDietzResult } from "./performance.type";

function measured(result: ModifiedDietzResult) {
  if (!result.ok) throw new Error(`expected a rate, got ${result.reason}`);
  return result;
}

describe("flowWeight", () => {
  it("is 1 for a flow on the first day of the period", () => {
    expect(flowWeight("2025-01-01", "2025-01-01", 365)).toBe(1);
  });

  it("is 1 / CD for a flow on the last day of the period", () => {
    expect(flowWeight("2025-12-31", "2025-01-01", 365)).toBe(0.0027397260273972603);
    expect(flowWeight("2025-12-31", "2025-01-01", 365)).toBe(1 / 365);
  });

  it("weights a mid-year flow by the part of the period that follows it", () => {
    // 2025-07-01 is day 181 of 365, so 184 days of the period follow it.
    expect(flowWeight("2025-07-01", "2025-01-01", 365)).toBe(184 / 365);
  });
});

describe("averageCapital", () => {
  it("adds each flow weighted by the part of the period that followed it", () => {
    const capital = averageCapital(
      5000,
      [{ date: "2025-07-01", amount: 10000 }],
      "2025-01-01",
      "2026-01-01",
    );
    expect(capital).toBe(10041.09589041096);
  });
});

describe("modifiedDietz", () => {
  it("spec example: BV 5 000, +10 000 on 2025-07-01, EV 16 500 → +14.94%", () => {
    expect(dayIndex("2026-01-01") - dayIndex("2025-01-01")).toBe(365);
    const result = measured(
      modifiedDietz({
        beginValue: 5000,
        endValue: 16500,
        flows: [{ date: "2025-07-01", amount: 10000 }],
        start: "2025-01-01",
        endExclusive: "2026-01-01",
      }),
    );
    expect(result.averageCapital).toBe(10041.09589041096);
    expect(result.rate).toBeCloseTo(0.14938608458390176, 12);
    expect(formatSignedPercent(result.rate)).toBe("+14.94%");
  });

  it("uses the leap year's 366 days for the same figures → +14.96%", () => {
    expect(dayIndex("2025-01-01") - dayIndex("2024-01-01")).toBe(366);
    const result = measured(
      modifiedDietz({
        beginValue: 5000,
        endValue: 16500,
        flows: [{ date: "2024-07-01", amount: 10000 }],
        start: "2024-01-01",
        endExclusive: "2025-01-01",
      }),
    );
    expect(result.averageCapital).toBe(10027.322404371585);
    expect(result.rate).toBeCloseTo(0.14959128065395094, 12);
    expect(formatSignedPercent(result.rate)).toBe("+14.96%");
  });

  it("counts a flow on the first day in full", () => {
    const result = measured(
      modifiedDietz({
        beginValue: 0,
        endValue: 11000,
        flows: [{ date: "2025-01-01", amount: 10000 }],
        start: "2025-01-01",
        endExclusive: "2026-01-01",
      }),
    );
    expect(result.averageCapital).toBe(10000);
    expect(result.rate).toBe(0.1);
  });

  it("reports a negative average capital instead of a rate", () => {
    const result = modifiedDietz({
      beginValue: 1000,
      endValue: 0,
      flows: [{ date: "2025-01-02", amount: -3000 }],
      start: "2025-01-01",
      endExclusive: "2026-01-01",
    });
    expect(result).toEqual({
      ok: false,
      reason: "NON_POSITIVE_AVERAGE_CAPITAL",
      averageCapital: -1991.7808219178082,
    });
  });

  it("treats float residue as no capital at all", () => {
    // Two portfolios holding 0.1 and 0.2 shares at a $10 close, both sold on the first day.
    const beginValue = (0.1 + 0.2) * 10;
    expect(beginValue).toBe(3.0000000000000004);
    const result = modifiedDietz({
      beginValue,
      endValue: 0,
      flows: [
        { date: "2025-01-01", amount: -1 },
        { date: "2025-01-01", amount: -2 },
      ],
      start: "2025-01-01",
      endExclusive: "2025-01-02",
    });
    // Unguarded, that denominator of 4.44e-16 would report a rate of exactly -1, i.e. -100.00%.
    expect(result).toEqual({
      ok: false,
      reason: "NON_POSITIVE_AVERAGE_CAPITAL",
      averageCapital: 4.440892098500626e-16,
    });
  });

  it("throws on a zero-length or inverted period", () => {
    const input = { beginValue: 1000, endValue: 1000, flows: [] };
    expect(() => modifiedDietz({ ...input, start: "2025-01-01", endExclusive: "2025-01-01" })).toThrow(
      RangeError,
    );
    expect(() => modifiedDietz({ ...input, start: "2025-02-01", endExclusive: "2025-01-01" })).toThrow(
      RangeError,
    );
  });

  it("throws on a flow outside the period", () => {
    const input = {
      beginValue: 1000,
      endValue: 1000,
      start: "2025-01-01",
      endExclusive: "2026-01-01",
    };
    expect(() => modifiedDietz({ ...input, flows: [{ date: "2024-12-31", amount: 10 }] })).toThrow(
      RangeError,
    );
    // endExclusive itself is outside the period.
    expect(() => modifiedDietz({ ...input, flows: [{ date: "2026-01-01", amount: 10 }] })).toThrow(
      RangeError,
    );
  });

  it("never annualises a partial period", () => {
    expect(dayIndex("2026-01-01") - dayIndex("2025-07-01")).toBe(184);
    const result = measured(
      modifiedDietz({
        beginValue: 0,
        endValue: 11000,
        flows: [{ date: "2025-07-01", amount: 10000 }],
        start: "2025-07-01",
        endExclusive: "2026-01-01",
      }),
    );
    // Half a year at +10% is reported as +10%, not scaled up to +20.87%.
    expect(result.rate).toBe(0.1);
  });
});
