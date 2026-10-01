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
 * Formats a Postgres `date` or `timestamptz` as `15 oct 2026` (date only).
 *
 * Accepts both shapes on purpose. A bare `yyyy-mm-dd` calendar date gets the
 * `T00:00:00` suffix, because `new Date("2026-10-15")` is parsed as UTC midnight
 * and renders as the previous day in any negative UTC offset. A value that
 * already carries a time component is parsed as-is and rendered in the server
 * timezone.
 *
 * Use `formatDateTime` when the time of day matters. Returns the raw input when
 * the value is not a parseable date.
 */
export function formatDate(value: string): string {
  const hasTime = value.includes("T")
  const date = new Date(hasTime ? value : `${value}T00:00:00`)
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
 * Injection guard for user-supplied search terms interpolated into a PostgREST
 * `.or()` filter string. Strips the characters that would otherwise let a value
 * escape the `ilike.%term%` value and break out into another filter clause,
 * then collapses whitespace. Returns `""` when nothing survives, which callers
 * treat as "no search applied".
 */
export function formatSearchTerm(raw: string): string {
  return raw
    .trim()
    .replace(/[%*,()]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}
