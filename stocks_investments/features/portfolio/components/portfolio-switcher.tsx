import Link from "next/link";
import { SelectField, type SelectOption } from "@/components/ui/select-field";

type PortfolioSwitcherProps =
  | { status: "loading" }
  | { status: "empty"; manageHref: string }
  | { status: "ready"; options: readonly SelectOption[]; value: string; manageHref: string; onChange: (value: string) => void };

const LINK_CLASS_NAME = "text-xs text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary";

export function PortfolioSwitcher(props: PortfolioSwitcherProps) {
  if (props.status === "loading") {
    // Same height as the loaded selector, so the navigation below does not jump.
    return <div aria-hidden="true" className="h-[5.75rem] animate-pulse rounded-md bg-surface" />;
  }

  if (props.status === "empty") {
    return (
      <div className="flex h-[5.75rem] flex-col justify-center gap-1 rounded-md border border-border px-3">
        <p className="text-sm text-muted">No portfolios yet</p>
        <Link href={props.manageHref} className={LINK_CLASS_NAME}>
          Create a portfolio
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-[5.75rem] flex-col gap-2">
      <SelectField
        id="active-portfolio"
        label="Portfolio"
        value={props.value}
        options={props.options}
        onChange={props.onChange}
      />
      <Link href={props.manageHref} className={`self-start ${LINK_CLASS_NAME}`}>
        Manage portfolios
      </Link>
    </div>
  );
}
