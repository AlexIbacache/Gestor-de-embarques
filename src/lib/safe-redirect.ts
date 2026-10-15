/**
 * Open-redirect guard, shared by every server-side consumer of `next`.
 *
 * `next` is attacker-controllable: the middleware echoes it into the login URL
 * and it then travels through a hidden form field, so it must be validated
 * before it is ever used as a navigation destination. The login action, the
 * login page and the middleware all apply this ONE rule — three copies of it is
 * how the destination got silently discarded before.
 *
 * Accepted: a path that starts with exactly one `/` (e.g. `/embarques`,
 * `/embarques?page=2`).
 *
 * Rejected, all falling back to {@link DEFAULT_REDIRECT_PATH}:
 *   - anything that does not start with `/` (`dashboard`, `https://evil.com`);
 *   - a protocol-relative URL (`//evil.com`, `///evil.com`);
 *   - any value containing a backslash (`/\evil.com`), which some browsers
 *     normalise to `//evil.com`;
 *   - any value containing control characters or whitespace, which browsers
 *     strip before parsing and which could smuggle a `//` past the checks above
 *     (e.g. `/<tab>/evil.com`).
 */

/** Default landing page, used whenever `next` is absent or rejected. */
export const DEFAULT_REDIRECT_PATH = "/dashboard";

export function safeRedirectPath(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    return DEFAULT_REDIRECT_PATH;
  }
  if (!value.startsWith("/")) return DEFAULT_REDIRECT_PATH;
  if (value.startsWith("//")) return DEFAULT_REDIRECT_PATH;
  if (value.includes("\\")) return DEFAULT_REDIRECT_PATH;
  if (/[\u0000-\u001F\u007F\s]/.test(value)) return DEFAULT_REDIRECT_PATH;
  return value;
}
