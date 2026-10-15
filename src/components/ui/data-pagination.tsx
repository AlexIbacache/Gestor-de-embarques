"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PAGE_ELLIPSIS,
  PAGE_SIZE_OPTIONS,
  buildPaginationHref,
  getPageItems,
} from "@/lib/pagination";

/**
 * Base UI's `items` prop, so the trigger shows the size as a number. The values
 * are strings because every enum-like `Select` in this app works in strings
 * (see `shipment-filters.tsx`); the numeric `pageSize` prop is stringified at
 * the boundary and parsed back in the handler.
 */
const PAGE_SIZE_ITEMS = PAGE_SIZE_OPTIONS.map((size) => ({
  value: String(size),
  label: String(size),
}));

type DataPaginationProps = {
  /** The page actually being rendered, already clamped server-side. */
  page: number;
  totalPages: number;
  pageSize: number;
  /** Shown nowhere but kept in the contract for the "X of N" summary. */
  totalCount: number;
};

/**
 * Shared pagination control for the clients and shipments listings (design
 * decision D5): numbered pages with ellipses, previous/next and a 10/25/50 page
 * size selector.
 *
 * Every navigation is URL-driven. The component reads the current query string
 * itself and rewrites only the key it owns, so the active search, sort, order
 * and date filters survive a paging click and the URL stays shareable. Paging
 * uses `next/link` (a client transition, no full reload); the page-size change
 * uses `router.replace` and resets to page 1, because the same offset under a
 * different page size would point at a different slice of rows.
 */
export function DataPagination({
  page,
  totalPages,
  pageSize,
  totalCount,
}: DataPaginationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const items = getPageItems(page, totalPages);

  function hrefFor(target: number): string {
    return buildPaginationHref(pathname, searchParams, { page: target });
  }

  function handlePageSizeChange(value: string | null) {
    if (value === null) return;
    const nextSize = Number(value);
    if (!Number.isInteger(nextSize)) return;

    // `page: 1` is folded into the same navigation: a bigger page changes the
    // whole offset, so staying on the old page would show the wrong rows.
    router.replace(
      buildPaginationHref(pathname, searchParams, { pageSize: nextSize, page: 1 }),
      { scroll: false },
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Página {page} de {totalPages}
        <span className="sr-only"> ({totalCount} registros en total)</span>
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          {/* `id` goes on the Root: `SelectTrigger` resolves `idProp ?? rootId`,
              so `htmlFor` points at the real focusable control. */}
          <Label
            htmlFor="data-pagination-page-size"
            className="text-sm font-normal text-muted-foreground"
          >
            Filas por página
          </Label>
          <Select
            id="data-pagination-page-size"
            items={PAGE_SIZE_ITEMS}
            value={String(pageSize)}
            onValueChange={handlePageSizeChange}
          >
            <SelectTrigger size="sm" className="w-[72px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <nav aria-label="Paginación" className="flex items-center gap-1">
          <PageControl disabled={page <= 1} href={hrefFor(page - 1)}>
            <ChevronLeft data-icon="inline-start" aria-hidden="true" />
            Anterior
          </PageControl>

          {items.map((item, index) =>
            item === PAGE_ELLIPSIS ? (
              <span
                key={`ellipsis-${index}`}
                aria-hidden="true"
                className="px-1 text-sm text-muted-foreground"
              >
                …
              </span>
            ) : (
              <PageNumber
                key={item}
                page={item}
                isCurrent={item === page}
                href={hrefFor(item)}
              />
            ),
          )}

          <PageControl disabled={page >= totalPages} href={hrefFor(page + 1)}>
            Siguiente
            <ChevronRight data-icon="inline-end" aria-hidden="true" />
          </PageControl>
        </nav>
      </div>
    </div>
  );
}

/**
 * One numbered target. The current page is a filled button and carries
 * `aria-current="page"`; the rest are ghost links, so the control reads as a
 * set of destinations rather than actions.
 */
function PageNumber({
  page,
  isCurrent,
  href,
}: {
  page: number;
  isCurrent: boolean;
  href: string;
}) {
  return (
    <Button
      variant={isCurrent ? "default" : "ghost"}
      size="icon-sm"
      aria-current={isCurrent ? "page" : undefined}
      aria-label={`Página ${page}`}
      render={<Link href={href} />}
    >
      {page}
    </Button>
  );
}

/**
 * `disabled` on `render={<Link />}` would be a lie: an `<a>` has no `:disabled`
 * state, so it would still be clickable, keyboard-reachable, and Tailwind's
 * `disabled:` variant would never dim it. The disabled branch therefore renders
 * a real native `<button disabled>` instead (same pattern as the pages this
 * component replaces).
 */
function PageControl({
  disabled,
  href,
  children,
}: {
  disabled: boolean;
  href: string;
  children: ReactNode;
}) {
  if (disabled) {
    return (
      <Button variant="outline" size="sm" disabled>
        {children}
      </Button>
    );
  }

  return (
    <Button variant="outline" size="sm" render={<Link href={href} />}>
      {children}
    </Button>
  );
}
