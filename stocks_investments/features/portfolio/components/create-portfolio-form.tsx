import { Plus } from "lucide-react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";
import { PORTFOLIO_NAME_INPUT_MAX_LENGTH } from "../portfolio-form.constants";

type CreatePortfolioFormProps = {
  name: string;
  error: string | null;
  isSubmitting: boolean;
  onNameChange: (value: string) => void;
  onSubmit: () => void;
};

export function CreatePortfolioForm({ name, error, isSubmitting, onNameChange, onSubmit }: CreatePortfolioFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <Card>
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4" aria-labelledby="new-portfolio-title">
        <h2 id="new-portfolio-title" className="text-base font-semibold text-foreground">
          New portfolio
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex-1">
            <TextField
              id="new-portfolio-name"
              label="Portfolio name"
              hideLabel
              placeholder="e.g. Retirement"
              autoComplete="off"
              maxLength={PORTFOLIO_NAME_INPUT_MAX_LENGTH}
              value={name}
              error={error ?? undefined}
              onChange={(event) => onNameChange(event.target.value)}
            />
          </div>
          <Button type="submit" disabled={isSubmitting}>
            <Plus aria-hidden="true" className="size-4" strokeWidth={2} />
            {isSubmitting ? "Creating…" : "Create Portfolio"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
