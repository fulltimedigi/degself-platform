/**
 * Parse a JSON request body that must be a plain object.
 *
 * `request.json()` accepts valid JSON primitives such as `null`, strings, and
 * arrays. API handlers in this app read named fields, so accepting those values
 * turns a client error into an unhandled 500. Keep that boundary consistent and
 * fail the request as invalid before route-specific validation runs.
 */
export async function readJsonObject(
  request: Request
): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await request.json();
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return null;
    }
    return value as Record<string, unknown>;
  } catch {
    return null;
  }
}
