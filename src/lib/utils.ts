export { cn } from "cn"

const DATE_FORMATTER = new Intl.DateTimeFormat("es", {
  day: "numeric",
  month: "short",
  year: "numeric",
})

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("es", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

/**
 * Date strategy (design decision D20).
 *
 * Postgres `date` columns (e.g. `shipments.eta`) are CALENDAR dates, not
 * instants: they name a civil day with no timezone. JavaScript parses a bare
 * `"2026-10-15"` as UTC midnight, which renders as the previous day in any
 * negative UTC offset (e.g. UTC-3). Appending `T00:00:00` forces a LOCAL-time
 * parse so the civil date is preserved in every timezone.
 *
 * `created_at` (and every other `timestamptz`) is an instant and must be parsed
 * as-is — never through this helper. Use `parseCalendarDate` for `date` columns
 * and `new Date(iso)` for instants.
 */
export function parseCalendarDate(value: string): Date {
  return new Date(`${value}T00:00:00`)
}

/**
 * Formats a Postgres `date` or `timestamptz` as `15 oct 2026` (date only).
 *
 * Accepts both shapes on purpose. A bare `yyyy-mm-dd` calendar date goes through
 * `parseCalendarDate` (local parse, see the date-strategy note above) so it
 * renders on the correct civil day in negative UTC offsets. A value that already
 * carries a time component is parsed as-is and rendered in the server timezone.
 *
 * Use `formatDateTime` when the time of day matters. Returns the raw input when
 * the value is not a parseable date.
 */
export function formatDate(value: string): string {
  const hasTime = value.includes("T")
  const date = hasTime ? new Date(value) : parseCalendarDate(value)
  if (Number.isNaN(date.getTime())) return value
  return DATE_FORMATTER.format(date)
}

/**
 * Formats a Postgres `timestamptz` as `15 oct 2026, 14:30`.
 *
 * Timestamps already carry a UTC offset, so they are parsed as-is and rendered
 * in the server timezone. Do NOT pass a bare `yyyy-mm-dd` calendar date: it is
 * parsed as UTC midnight, which shifts a day in negative offsets — use
 * `formatDate` for `date` columns. Returns the raw input when the value is not
 * a parseable date.
 */
export function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return DATE_TIME_FORMATTER.format(date)
}

/**
 * Escapes a user-supplied value so it can be interpolated literally into a
 * PostgREST `.or()` filter string (design decision D14).
 *
 * PostgREST treats `,`, `.`, `:`, `(`, `)` as reserved query grammar; a value
 * that contains them unquoted is split into other clauses or rejected with a
 * 400. The neutralisation is the surrounding double quotes: inside a quoted
 * span PostgREST reads those characters as data, not syntax. Only two
 * characters still need a backslash escape there — a bare `"` would close the
 * span early and a bare `\` would begin an escape sequence — so the value is
 * escaped as `\"` and `\\` (PostgREST's documented convention).
 *
 * The backslash is escaped FIRST, otherwise the escape added for `"` would
 * itself be doubled. The result is a single quoted literal, e.g. `"Smith, John"`,
 * ready to append after an operator: `name.ilike."%Smith, John%"`.
 *
 * `%`, `_` and `*` are NOT touched here: they are LIKE/ilike pattern wildcards
 * (PostgREST maps `*` to `%`), not query grammar. The caller keeps the match to a
 * literal substring by wrapping the term in `%`.
 */
export function escapePostgrestValue(raw: string): string {
  const escaped = raw.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
  return `"${escaped}"`
}

/**
 * Validates a strict `YYYY-MM-DD` calendar date and returns it unchanged, or
 * `undefined` for anything else (wrong shape, impossible day, empty). Used by
 * the clients `from` / `to` filters.
 *
 * The round-trip check (`toISOString()` must reproduce the input) rejects days
 * that JavaScript would otherwise roll over silently: `2026-02-30` parses to
 * March 2, so it is refused rather than quietly filtering on the wrong day.
 */
export function parseCalendarDateParam(
  raw: string | undefined,
): string | undefined {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return undefined;
  const date = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10) === raw ? raw : undefined;
}

/**
 * The UTC instant that starts the day AFTER `calendarDate` (`YYYY-MM-DD`),
 * ISO-8601. This is the exclusive upper bound of the clients date filter.
 *
 * Date strategy (design decision D20): `clients.created_at` is a `timestamptz`
 * INSTANT, while `from` / `to` are civil CALENDAR dates with no timezone. A
 * boundary has to be chosen, and this app does not invent the user's timezone:
 * the day boundaries are UTC. The range is half-open — `created_at >=
 * fromT00:00Z` and `created_at < (to + 1 day)T00:00Z` — so the whole `to` day is
 * included without an inclusive-end rounding error. Consequence: a row created
 * at `2026-06-30 22:00` in UTC-3 is `2026-07-01 01:00Z` and is excluded by
 * `to=2026-06-30`.
 */
export function startOfNextUtcDay(calendarDate: string): string {
  const date = new Date(`${calendarDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString();
}

/**
 * The inclusive UTC lower bound for a calendar date, ISO-8601: midnight UTC of
 * that day. The counterpart of {@link startOfNextUtcDay} for the clients
 * `created_at` filter.
 */
export function startOfUtcDay(calendarDate: string): string {
  return new Date(`${calendarDate}T00:00:00.000Z`).toISOString();
}
