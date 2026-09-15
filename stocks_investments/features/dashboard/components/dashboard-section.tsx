import type { ReactNode } from "react";

type DashboardSectionProps = {
  titleId: string;
  title: string;
  // Right-aligned next to the title, e.g. a "View all" link.
  action?: ReactNode;
  children: ReactNode;
};

export function DashboardSection({ titleId, title, action, children }: DashboardSectionProps) {
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <h2 id={titleId} className="text-base font-semibold text-foreground">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
