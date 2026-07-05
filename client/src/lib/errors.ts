/** Translate raw API/fetch errors into messages fit for humans.
 *
 * apiRequest throws `Error("401: {\"detail\":\"...\"}")`, and network-level
 * failures surface as "Failed to fetch" — neither should reach the user as-is.
 * `overrides` lets a call site replace the default message for specific
 * status codes (e.g. 401 during OTP entry means "wrong code", not "wrong
 * password").
 */
export function friendlyError(
  err: unknown,
  overrides?: Record<number, string>,
): string {
  const raw = err instanceof Error ? err.message : String(err);

  // Server unreachable, connection dropped, CORS, etc.
  if (/failed to fetch|networkerror|load failed/i.test(raw)) {
    return "We can't reach the server right now. Check your connection and try again.";
  }

  const match = raw.match(/^(\d{3}):\s*([\s\S]*)$/);
  if (!match) {
    return raw || "Something went wrong. Please try again.";
  }

  const status = Number(match[1]);
  let detail = match[2].trim();
  try {
    const parsed = JSON.parse(detail);
    if (typeof parsed?.detail === "string") detail = parsed.detail;
  } catch {
    // Body wasn't JSON — use it as-is.
  }

  if (overrides?.[status]) return overrides[status];

  switch (status) {
    case 401:
      return "That phone number and password don't match. Try again or reset your password.";
    case 403:
      return "You don't have permission to do that.";
    case 404:
      return "We couldn't find an account for that phone number.";
    case 429:
      return "Too many attempts. Wait a moment and try again.";
    default:
      if (status >= 500) {
        return "Something went wrong on our end. Please try again in a moment.";
      }
      return detail || "Something went wrong. Please try again.";
  }
}
