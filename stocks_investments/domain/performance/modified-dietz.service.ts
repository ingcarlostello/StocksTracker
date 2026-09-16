import { dayIndex } from "../../utils/date.utils";
import { MONEY_EPSILON } from "./performance.constants";
import type { CashFlow, ModifiedDietzInput, ModifiedDietzResult } from "./performance.type";

// Part of the period that follows a flow, counting it at the start of its day: 1 on the first day of the
// period, 1 / CD on the last one.
export function flowWeight(flowDate: string, start: string, calendarDays: number): number {
  return (calendarDays - (dayIndex(flowDate) - dayIndex(start))) / calendarDays;
}

// Starting value plus each flow weighted by the part of the period that followed it: the capital the
// period actually had at work, which is what the return is measured against.
export function averageCapital(
  beginValue: number,
  flows: readonly CashFlow[],
  start: string,
  endExclusive: string,
): number {
  const calendarDays = dayIndex(endExclusive) - dayIndex(start);
  return flows.reduce(
    (total, flow) => total + flowWeight(flow.date, start, calendarDays) * flow.amount,
    beginValue,
  );
}

// R = (EV − BV − ΣF) / (BV + ΣW·F), never annualised.
// A zero-length period or a flow outside it is a caller bug, not a user state, so both throw.
export function modifiedDietz(input: ModifiedDietzInput): ModifiedDietzResult {
  const { beginValue, endValue, flows, start, endExclusive } = input;
  const calendarDays = dayIndex(endExclusive) - dayIndex(start);

  if (calendarDays <= 0) {
    throw new RangeError(`Modified Dietz needs a non-empty period, got [${start}, ${endExclusive})`);
  }
  for (const flow of flows) {
    if (flow.date < start || flow.date >= endExclusive) {
      throw new RangeError(`Cash flow on ${flow.date} lies outside [${start}, ${endExclusive})`);
    }
  }

  const capital = averageCapital(beginValue, flows, start, endExclusive);
  if (capital <= MONEY_EPSILON) {
    return { ok: false, reason: "NON_POSITIVE_AVERAGE_CAPITAL", averageCapital: capital };
  }

  const net = flows.reduce((total, flow) => total + flow.amount, 0);
  return { ok: true, rate: (endValue - beginValue - net) / capital, averageCapital: capital };
}
