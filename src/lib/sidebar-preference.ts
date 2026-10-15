/**
 * Shared contract for the desktop sidebar collapse preference.
 *
 * The preference changes the SERVER-rendered markup (the sidebar width and the
 * elements hidden inside the rail), so it cannot live in `localStorage`: the
 * server would always paint the expanded state and the client would correct it
 * after hydration, producing a visible flash on reload. A cookie is readable
 * during SSR, so the server and the client's first render resolve the SAME
 * value from the SAME source.
 *
 * Kept in this ONE module so the reader (the `(dashboard)` layout) and the
 * writer (the client toggle) can never drift on the cookie name or the
 * encoding.
 */

/** Cookie that stores whether the desktop sidebar is collapsed. */
export const SIDEBAR_COLLAPSED_COOKIE = "sidebar-collapsed";

/** One year, in seconds: this is long-lived UI state, not a session signal. */
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Cookie value that means "collapsed". Anything else means "expanded". */
export const SIDEBAR_COLLAPSED_VALUE = "true";

/**
 * Resolves the stored preference from a raw cookie value. Only the exact
 * `"true"` string collapses the rail, so an absent, empty or corrupted cookie
 * degrades to the expanded default instead of throwing.
 *
 * The server layout and the client's `useState` initialiser both call this, so
 * the SSR markup and the first client render agree by construction.
 */
export function parseCollapsedPreference(value: string | undefined): boolean {
  return value === SIDEBAR_COLLAPSED_VALUE;
}

/**
 * Serialises the `document.cookie` write for the preference.
 *
 * `path=/` makes it readable on every route (the layout reads it app-wide),
 * `max-age` makes it survive reloads, and `SameSite=Lax` keeps the write
 * same-site. It is intentionally NOT `httpOnly`: the client must be able to
 * write it on toggle, and it is a non-sensitive UI preference.
 */
export function serializeCollapsedPreference(collapsed: boolean): string {
  return [
    `${SIDEBAR_COLLAPSED_COOKIE}=${
      collapsed ? SIDEBAR_COLLAPSED_VALUE : "false"
    }`,
    "path=/",
    `max-age=${SIDEBAR_COOKIE_MAX_AGE}`,
    "samesite=lax",
  ].join("; ");
}
