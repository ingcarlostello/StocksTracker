// Plain object check for untrusted payloads (JSON bodies, error data) before reading their fields.
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
