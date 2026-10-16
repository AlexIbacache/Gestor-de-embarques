import Link from "next/link";

import { cn } from "@/lib/utils";
import { SHIPMENT_STATUSES, type ShipmentStatus } from "@/lib/domain/shipments";

type ShipmentStatusTabsProps = {
  /** Current URL params, so search and modality survive a tab change. */
  params: URLSearchParams;
  /** Status currently applied, or `undefined` for "Todos". */
  active: ShipmentStatus | undefined;
  /** Counts per status and the grand total; `null` when they could not load. */
  counts: { total: number; byStatus: Record<string, number> } | null;
  /** The list the tabs navigate to. */
  path: string;
};

/**
 * Status filter as tabs with counters, the primary way to slice the shipments
 * list: one click shows, say, only the delayed ones, and the number on each tab
 * says how many to expect before clicking.
 *
 * Plain links to `?status=` (the URL stays the single source of truth, same as
 * `ShipmentFilters`), so there is no client state and the tabs work without
 * JavaScript. A tab keeps the other params and drops `page`, because a different
 * result set invalidates the current offset.
 *
 * The counters are global (all shipments, not the current search). They answer
 * "how many are in each state", which is what the tabs are for; the table's own
 * footer reports the count for the current search.
 */
export function ShipmentStatusTabs({
  params,
  active,
  counts,
  path,
}: ShipmentStatusTabsProps) {
  function hrefFor(status: ShipmentStatus | null): string {
    const next = new URLSearchParams(params.toString());
    next.delete("page");

    if (status) next.set("status", status);
    else next.delete("status");

    const query = next.toString();
    return query ? `${path}?${query}` : path;
  }

  const tabs: { label: string; status: ShipmentStatus | null; count?: number }[] =
    [
      { label: "Todos", status: null, count: counts?.total },
      ...SHIPMENT_STATUSES.map((status) => ({
        label: status,
        status,
        count: counts ? (counts.byStatus[status] ?? 0) : undefined,
      })),
    ];

  return (
    <nav
      aria-label="Filtrar por estado"
      className="-mx-1 flex gap-1 overflow-x-auto border-b px-1"
    >
      {tabs.map((tab) => {
        const isActive = (tab.status ?? undefined) === active;
        const isDelayed = tab.status === "Retrasado";

        return (
          <Link
            key={tab.label}
            href={hrefFor(tab.status)}
            // Same page, different filter: keep the scroll position.
            scroll={false}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "-mb-px flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {tab.count !== undefined ? (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                  isDelayed && tab.count > 0
                    ? "bg-danger/12 text-danger"
                    : isActive
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-foreground",
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
