import { Plus } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NO_PORTFOLIOS_MESSAGE } from "../portfolio-messages.constants";

type NoPortfoliosNoticeProps = {
  createHref: string;
};

export function NoPortfoliosNotice({ createHref }: NoPortfoliosNoticeProps) {
  return (
    <Card className="flex max-w-xl flex-col items-start gap-4">
      <p className="text-sm text-muted">{NO_PORTFOLIOS_MESSAGE}</p>
      <ButtonLink href={createHref}>
        <Plus aria-hidden="true" className="size-4" strokeWidth={2} />
        Create Portfolio
      </ButtonLink>
    </Card>
  );
}
