import type { PortfolioNameIssueCode } from "@/domain/portfolio/portfolio.type";

export type PortfolioMutationError =
  | { kind: "validation"; issue: PortfolioNameIssueCode }
  | { kind: "duplicate-name" }
  | { kind: "not-found" }
  | { kind: "not-empty" }
  | { kind: "unexpected" };

export type PortfolioMutationResult<TValue> =
  | { ok: true; value: TValue }
  | { ok: false; error: PortfolioMutationError };

// What a row on the manage page is doing right now.
export type PortfolioRowMode = "view" | "renaming" | "confirming-delete";
