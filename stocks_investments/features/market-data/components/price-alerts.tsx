import { missingClosesMessage } from "../price-status.utils";
import type { PricesState } from "../prices-state.type";

type PriceAlertsProps = Pick<PricesState, "errorMessage" | "missing">;

// Sibling paragraphs with no wrapper, so each page places them inside its own column.
export function PriceAlerts({ errorMessage, missing }: PriceAlertsProps) {
  const missingMessage = missingClosesMessage(missing);

  return (
    <>
      {errorMessage ? (
        <p role="alert" className="text-sm text-negative">
          {errorMessage}
        </p>
      ) : null}
      {missingMessage ? <p className="text-sm text-muted">{missingMessage}</p> : null}
    </>
  );
}
