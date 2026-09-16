"use client";

import { PageHeader } from "@/components/layout/page-header";
import { SelectField } from "@/components/ui/select-field";
import { ROUTES } from "@/constants/routes.constants";
import { NoPortfoliosNotice } from "@/features/portfolio/components/no-portfolios-notice";
import { usePerformanceView } from "../hooks/use-performance-view.hook";
import { PERFORMANCE_MESSAGES } from "../performance-messages.constants";
import { PERFORMANCE_TEXT, PERFORMANCE_YEAR_SELECT_ID } from "../performance.constants";
import type { PerformanceContent, PerformanceViewState } from "../performance.type";
import { MethodologyNote } from "./methodology-note";
import { PerformanceCards } from "./performance-cards";
import { PerformanceNotes } from "./performance-notes";
import { PerformancePricesError } from "./performance-prices-error";
import { PerformanceSummary } from "./performance-summary";

type PerformanceYearProps = {
  content: PerformanceContent;
};

// The selected year: its closing prices are loading, failed, or resolved into the figures below.
function PerformanceYear({ content }: PerformanceYearProps) {
  if (content.kind === "loading") {
    return <p className="text-sm text-muted">{content.message}</p>;
  }

  if (content.kind === "error") {
    return (
      <PerformancePricesError
        message={content.message}
        canRetry={content.canRetry}
        onRetry={content.onRetry}
        cooldownMessage={content.cooldownMessage}
      />
    );
  }

  return (
    <>
      <PerformanceCards cards={content.cards} />
      <PerformanceNotes notes={content.notes} />
      <PerformanceSummary summary={content.summary} />
      <MethodologyNote />
    </>
  );
}

type PerformanceBodyProps = {
  state: PerformanceViewState;
};

// Everything below the header: one branch per view state.
function PerformanceBody({ state }: PerformanceBodyProps) {
  if (state.status === "loading") {
    return <p className="text-sm text-muted">{PERFORMANCE_MESSAGES.LOADING}</p>;
  }

  if (state.status === "no-portfolios") {
    return <NoPortfoliosNotice createHref={ROUTES.PORTFOLIOS} />;
  }

  if (state.status === "invalid-history") {
    return (
      <p role="alert" className="rounded-lg border border-negative/40 bg-sell-tint p-4 text-sm text-foreground">
        {state.message}
      </p>
    );
  }

  if (state.status === "empty") {
    return (
      <p className="rounded-lg border border-border bg-surface p-6 text-sm text-muted">
        {PERFORMANCE_MESSAGES.EMPTY}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PerformanceYear content={state.content} />
    </div>
  );
}

// The only client boundary of /performance: the year select lives in the header actions.
export function PerformanceView() {
  const state = usePerformanceView();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={PERFORMANCE_TEXT.TITLE}
        subtitle={PERFORMANCE_TEXT.SUBTITLE}
        actions={
          state.status === "ready" ? (
            <SelectField
              id={PERFORMANCE_YEAR_SELECT_ID}
              label={PERFORMANCE_TEXT.YEAR_LABEL}
              hideLabel
              value={state.year.value}
              options={state.year.options}
              onChange={state.year.onChange}
            />
          ) : undefined
        }
      />
      {/* Always mounted, so a year switch is announced in the live region that already exists. */}
      <p role="status" aria-live="polite" className="sr-only">
        {state.status === "ready" ? state.announcement : ""}
      </p>
      <PerformanceBody state={state} />
    </div>
  );
}
