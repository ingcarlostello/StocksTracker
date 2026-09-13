import type { OversellViolation } from "../transactions/transaction.type";

export class OversellError extends Error {
  readonly violation: OversellViolation;

  constructor(violation: OversellViolation) {
    super(
      `Cannot sell ${violation.requested} ${violation.ticker} on ${violation.date}: only ${violation.available} held`,
    );
    this.name = "OversellError";
    this.violation = violation;
  }
}
