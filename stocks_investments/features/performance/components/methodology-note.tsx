import { Card } from "@/components/ui/card";
import { PERFORMANCE_METHODOLOGY } from "../performance-messages.constants";
import { PERFORMANCE_SECTION_IDS, PERFORMANCE_TEXT } from "../performance.constants";

// Static text: which method Total Return uses, which data it needs, how buys and sells count, and what
// Investment Performance is.
export function MethodologyNote() {
  return (
    <section aria-labelledby={PERFORMANCE_SECTION_IDS.METHODOLOGY}>
      <Card>
        <h2 id={PERFORMANCE_SECTION_IDS.METHODOLOGY} className="text-sm font-semibold text-foreground">
          {PERFORMANCE_TEXT.METHODOLOGY_TITLE}
        </h2>
        {/* Two columns keep the line length readable on a wide card; the responsive pass is Phase 13. */}
        <div className="mt-3 grid items-start gap-x-8 gap-y-3 lg:grid-cols-2">
          {PERFORMANCE_METHODOLOGY.map((paragraph) => (
            <p key={paragraph} className="text-sm leading-relaxed text-muted">
              {paragraph}
            </p>
          ))}
        </div>
      </Card>
    </section>
  );
}
