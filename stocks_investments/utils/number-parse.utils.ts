// Plain decimals only ("12", "0.5", ".5", "12."): no signs, exponents, separators or spaces inside.
const DECIMAL_INPUT_REGEX = /^(\d+\.?\d*|\.\d+)$/;

// Returns NaN for anything that is not a plain decimal, so validation reports it instead of guessing.
export function parseDecimalInput(text: string): number {
  const trimmed = text.trim();
  return DECIMAL_INPUT_REGEX.test(trimmed) ? Number(trimmed) : Number.NaN;
}
