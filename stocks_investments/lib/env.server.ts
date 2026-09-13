import "server-only";

export class MissingEnvError extends Error {
  readonly variable: string;

  constructor(variable: string) {
    super(`Missing required environment variable ${variable}`);
    this.name = "MissingEnvError";
    this.variable = variable;
  }
}

// Read lazily so `next build` succeeds without secrets; importing this from client code fails the build.
function requireEnv(variable: string): string {
  const value = process.env[variable]?.trim();
  if (!value) throw new MissingEnvError(variable);
  return value;
}

export function getMassiveApiKey(): string {
  return requireEnv("MASSIVE_API_KEY");
}

export function getConvexUrl(): string {
  return requireEnv("NEXT_PUBLIC_CONVEX_URL");
}
