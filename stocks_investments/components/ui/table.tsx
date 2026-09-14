import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";
import type { ReactNode } from "react";

type CellAlign = "start" | "end";

const ALIGN_CLASSES: Record<CellAlign, string> = {
  start: "text-left",
  end: "text-right",
};

function joinClasses(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

type TableProps = {
  // Read by screen readers only; names what the table shows.
  caption: string;
  children: ReactNode;
};

// Bordered, rounded container that scrolls sideways on narrow screens instead of squeezing the columns.
export function Table({ caption, children }: TableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm tabular-nums">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return <thead className="bg-surface-raised text-xs font-medium text-muted">{children}</thead>;
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-border bg-surface">{children}</tbody>;
}

export function TableRow({ children }: { children: ReactNode }) {
  return <tr>{children}</tr>;
}

export type TableSortDirection = "ascending" | "descending";

type TableHeaderSort = {
  // null while another column is the sorted one.
  direction: TableSortDirection | null;
  onToggle: () => void;
};

type TableHeaderCellProps = {
  align?: CellAlign;
  // Keeps the column name for screen readers, e.g. for an actions column.
  srOnly?: boolean;
  sort?: TableHeaderSort;
  children: ReactNode;
};

// Decorative: the header's aria-sort carries the state.
function SortIcon({ direction }: { direction: TableSortDirection | null }) {
  const Icon = direction === "ascending" ? ChevronUp : direction === "descending" ? ChevronDown : ChevronsUpDown;
  return (
    <Icon
      aria-hidden="true"
      className={joinClasses("size-3.5 shrink-0", direction === null && "opacity-60")}
      strokeWidth={1.75}
    />
  );
}

export function TableHeaderCell({ align = "start", srOnly, sort, children }: TableHeaderCellProps) {
  // aria-sort only on the sorted column; "none" everywhere else would be announced on every header.
  const ariaSort = sort?.direction ?? undefined;

  return (
    <th scope="col" aria-sort={ariaSort} className={joinClasses("px-4 py-3 font-medium", ALIGN_CLASSES[align])}>
      {srOnly ? <span className="sr-only">{children}</span> : null}
      {!srOnly && sort ? (
        <button
          type="button"
          onClick={sort.onToggle}
          className={joinClasses(
            "inline-flex w-full items-center gap-1 rounded-sm hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            align === "end" && "flex-row-reverse",
            sort.direction && "text-foreground",
          )}
        >
          {children}
          <SortIcon direction={sort.direction} />
        </button>
      ) : null}
      {!srOnly && !sort ? children : null}
    </th>
  );
}

type TableCellProps = {
  align?: CellAlign;
  // Semibold near-white, as for tickers.
  emphasis?: boolean;
  muted?: boolean;
  children: ReactNode;
};

export function TableCell({ align = "start", emphasis, muted, children }: TableCellProps) {
  return (
    <td
      className={joinClasses(
        "px-4 py-3 whitespace-nowrap",
        ALIGN_CLASSES[align],
        emphasis ? "font-semibold text-foreground" : muted ? "text-muted" : "text-foreground",
      )}
    >
      {children}
    </td>
  );
}
