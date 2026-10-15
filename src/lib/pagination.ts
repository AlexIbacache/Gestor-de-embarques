/**
 * Pure pagination helpers (design decision D5 — shared pagination with a
 * server-side clamp).
 *
 * Everything here is plain data-in/data-out: no React, no Supabase, no
 * `next/navigation`. The window algorithm in particular is the piece the
 * calendar of controls is built from, so keeping it pure makes it checkable
 * without rendering anything.
 */

/**
 * The page sizes the UI offers. `parsePageSize` only ever returns a member of
 * this set, so an unknown `?pageSize=` cannot widen the query.
 */
export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

/** The page size used when `?pageSize=` is absent or invalid. */
export const DEFAULT_PAGE_SIZE: (typeof PAGE_SIZE_OPTIONS)[number] = 10;

export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

/**
 * Sentinel for a run of skipped page numbers in the rendered window. A plain
 * object would do, but a frozen string keeps it usable as a React key and makes
 * the "is this an ellipsis?" check a comparison instead of a lookup.
 */
export const PAGE_ELLIPSIS = "ellipsis" as const;

export type PageItem = number | typeof PAGE_ELLIPSIS;

/**
 * `?page=` → positive integer, default 1.
 *
 * `Number`, not `parseInt`: `parseInt("2abc")` is `2`, which would silently
 * accept a malformed param. A non-integer, a `0`, a negative or a missing value
 * all fall back to page 1.
 */
export function parsePage(raw: string | undefined): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

/**
 * `?pageSize=` → one of {@link PAGE_SIZE_OPTIONS}, any other value → the
 * default. The returned value is the allowlist's own member, never the raw
 * param, so it is safe to multiply into an offset.
 */
export function parsePageSize(raw: string | undefined): PageSize {
  const parsed = Number(raw);
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(parsed)
    ? (parsed as PageSize)
    : DEFAULT_PAGE_SIZE;
}

/**
 * Total pages for a row count, never below 1: an empty list still has a page 1,
 * which is what keeps the zero-result case from rendering an empty table and,
 * more importantly, from making the clamp redirect in a loop.
 */
export function totalPagesFor(totalCount: number, pageSize: number): number {
  return Math.max(1, Math.ceil(totalCount / pageSize));
}

/**
 * Up to this many pages, the window shows every page number with no ellipsis:
 * a short list does not need to hide anything, and `7` is exactly the number of
 * slots a skeleton `1 · 2 · 3 · 4 · 5 · 6 · 7` occupies at the smallest size.
 */
export const MAX_PAGES_WITHOUT_ELLIPSIS = 7;

/**
 * The numbered window of the control: first and last page always visible, the
 * current page with one neighbour on each side, and an ellipsis wherever a gap
 * opens. Renders like `Anterior · 1 · 2 · 3 · … · 24 · 25 · Siguiente`.
 *
 * When the whole range fits under {@link MAX_PAGES_WITHOUT_ELLIPSIS} every page
 * is returned directly, so five pages read `1 · 2 · 3 · 4 · 5` instead of
 * `1 · 2 · … · 5`.
 *
 * `delta` is fixed at 1 on purpose: a wider window stops being a "where am I"
 * hint and becomes a second, worse scrollbar.
 */
export function getPageItems(currentPage: number, totalPages: number): PageItem[] {
  if (totalPages <= 1) return [1];

  if (totalPages <= MAX_PAGES_WITHOUT_ELLIPSIS) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const delta = 1;
  const items: PageItem[] = [1];

  const start = Math.max(2, currentPage - delta);
  const end = Math.min(totalPages - 1, currentPage + delta);

  if (start > 2) items.push(PAGE_ELLIPSIS);
  for (let page = start; page <= end; page += 1) items.push(page);
  if (end < totalPages - 1) items.push(PAGE_ELLIPSIS);

  items.push(totalPages);
  return items;
}

/**
 * Rebuilds a full href from the current query string, changing only the keys it
 * is asked to change.
 *
 * Every other param (`search`, `sort`, `order`, `from`, `to`, …) is copied
 * first, so a pagination click can never silently drop the active search or
 * sort. The default values are *removed* rather than written — page 1 and the
 * default page size are the unfiltered first page, and a clean URL is a
 * shareable one.
 */
export function buildPaginationHref(
  pathname: string,
  current: string | URLSearchParams,
  updates: { page?: number; pageSize?: number },
): string {
  const next = new URLSearchParams(
    typeof current === "string" ? current : current.toString(),
  );

  if (updates.page !== undefined) {
    if (updates.page <= 1) next.delete("page");
    else next.set("page", String(updates.page));
  }

  if (updates.pageSize !== undefined) {
    if (updates.pageSize === DEFAULT_PAGE_SIZE) next.delete("pageSize");
    else next.set("pageSize", String(updates.pageSize));
  }

  const query = next.toString();
  return query ? `${pathname}?${query}` : pathname;
}
