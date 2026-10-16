"use client";

import { useSyncExternalStore } from "react";
import dynamic from "next/dynamic";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn } from "@/components/ui/motion";
import { HoverElevation } from "@/components/ui/hover-elevation";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardStats } from "@/types/database";

/**
 * Matches Tailwind's `sm` boundary: below it the dashboard is a single narrow
 * column and the charts must switch to their label-light strategies.
 */
const NARROW_VIEWPORT_QUERY = "(max-width: 639px)";

function subscribeToViewport(callback: () => void) {
  const media = window.matchMedia(NARROW_VIEWPORT_QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function getNarrowViewportSnapshot(): boolean {
  return window.matchMedia(NARROW_VIEWPORT_QUERY).matches;
}

/**
 * `false` on the server and first client render: the charts themselves load
 * with `ssr: false`, so this only decides the post-hydration strategy and never
 * causes a mismatch. `useSyncExternalStore` is used instead of `useState` +
 * `useEffect` because setting state synchronously in an effect is disallowed by
 * the React lint rules.
 */
function getNarrowViewportServerSnapshot(): boolean {
  return false;
}

function useIsNarrowViewport(): boolean {
  return useSyncExternalStore(
    subscribeToViewport,
    getNarrowViewportSnapshot,
    getNarrowViewportServerSnapshot,
  );
}

/**
 * Recharts is a heavy client-only dependency. Loading it eagerly would put it in
 * the initial `/dashboard` bundle; `ssr: false` keeps it out of the server render
 * and the `loading` fallback reserves the chart height so the swap does not shift
 * layout.
 */
const chartLoading = () => <Skeleton className="h-[280px] w-full rounded-xl" />;

const ShipmentStatusChart = dynamic(
  () => import("./shipment-status-chart").then((m) => m.ShipmentStatusChart),
  { ssr: false, loading: chartLoading },
);

const ShipmentModalityChart = dynamic(
  () => import("./shipment-modality-chart").then((m) => m.ShipmentModalityChart),
  { ssr: false, loading: chartLoading },
);

const ShipmentTimelineChart = dynamic(
  () => import("./shipment-timeline-chart").then((m) => m.ShipmentTimelineChart),
  { ssr: false, loading: chartLoading },
);

type ChartCardProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

function ChartCard({
  title,
  description,
  children,
  className = "",
}: ChartCardProps) {
  return (
    <FadeIn>
      <HoverElevation>
        <Card
          className={`
            group
            overflow-hidden
            transition-colors
            duration-200
            hover:border-primary/30
            ${className}
          `}
        >
          <CardHeader className="px-5 pb-1 pt-5 md:px-6 md:pt-6">
            <CardTitle className="text-[15px] font-semibold tracking-[-0.01em]">
              {title}
            </CardTitle>

            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </CardHeader>

          <CardContent className="px-4 pb-5 pt-3 md:px-5 md:pb-6">
            {children}
          </CardContent>
        </Card>
      </HoverElevation>
    </FadeIn>
  );
}

/**
 * `stats` is the single pre-aggregated JSON value returned by the
 * `get_dashboard_stats()` RPC (design decision D16). The three charts read the
 * `by_status`, `by_modality` and `monthly` slices from it; none of them receives
 * raw shipment rows any more.
 */
export function DashboardCharts({
  stats,
  mode = "all",
}: {
  stats: DashboardStats;
  mode?: "all" | "status" | "timeline" | "modality";
}) {
  const isNarrow = useIsNarrowViewport();

  /*
   * ---------------------------------------------------------
   * STATUS
   * ---------------------------------------------------------
   */

  if (mode === "status") {
    return (
      <ChartCard
        title="Embarques por estado"
        description="Distribución actual según el estado"
      >
        <div className="min-h-[280px] min-w-0">
          <ShipmentStatusChart counts={stats.by_status} />
        </div>
      </ChartCard>
    );
  }

  /*
   * ---------------------------------------------------------
   * TIMELINE
   * ---------------------------------------------------------
   */

  if (mode === "timeline") {
    return (
      <ChartCard
        title="Embarques en el tiempo"
        description="Evolución de los embarques registrados"
      >
        <div className="min-h-[280px] min-w-0">
          <ShipmentTimelineChart buckets={stats.monthly} compact={isNarrow} />
        </div>
      </ChartCard>
    );
  }

  /*
   * ---------------------------------------------------------
   * MODALITY
   * ---------------------------------------------------------
   */

  if (mode === "modality") {
    return (
      <ChartCard
        title="Embarques por modalidad"
        description="Distribución según tipo de transporte"
      >
        <div className="min-h-[280px] min-w-0">
          <ShipmentModalityChart counts={stats.by_modality} compact={isNarrow} />
        </div>
      </ChartCard>
    );
  }

  /*
   * ---------------------------------------------------------
   * ALL
   * ---------------------------------------------------------
   */

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <ChartCard
        title="Embarques por estado"
        description="Distribución actual según el estado"
      >
        <div className="min-h-[280px] min-w-0">
          <ShipmentStatusChart counts={stats.by_status} />
        </div>
      </ChartCard>

      <ChartCard
        title="Embarques por modalidad"
        description="Distribución según tipo de transporte"
      >
        <div className="min-h-[280px] min-w-0">
          <ShipmentModalityChart counts={stats.by_modality} compact={isNarrow} />
        </div>
      </ChartCard>

      <ChartCard
        title="Embarques en el tiempo"
        description="Evolución de los embarques registrados"
        className="lg:col-span-2"
      >
        <div className="min-h-[280px] min-w-0">
          <ShipmentTimelineChart buckets={stats.monthly} compact={isNarrow} />
        </div>
      </ChartCard>
    </div>
  );
}