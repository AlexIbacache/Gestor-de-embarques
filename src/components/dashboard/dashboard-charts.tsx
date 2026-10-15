"use client";

import dynamic from "next/dynamic";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn } from "@/components/ui/motion";
import { HoverElevation } from "@/components/ui/hover-elevation";
import { Skeleton } from "@/components/ui/skeleton";

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
            rounded-2xl
            bg-card
            shadow-sm
            transition-shadow
            duration-200
            hover:shadow-md
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

export function DashboardCharts({
  statusData,
  modalityData,
  timelineData,
  mode = "all",
}: {
  statusData: { status: string }[];
  modalityData: { modality: string }[];
  timelineData: { created_at: string }[];
  mode?: "all" | "status" | "timeline" | "modality";
}) {
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
        <div className="min-h-[280px]">
          <ShipmentStatusChart data={statusData} />
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
        <div className="min-h-[280px]">
          <ShipmentTimelineChart data={timelineData} />
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
        <div className="min-h-[280px]">
          <ShipmentModalityChart data={modalityData} />
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
        <div className="min-h-[280px]">
          <ShipmentStatusChart data={statusData} />
        </div>
      </ChartCard>

      <ChartCard
        title="Embarques por modalidad"
        description="Distribución según tipo de transporte"
      >
        <div className="min-h-[280px]">
          <ShipmentModalityChart data={modalityData} />
        </div>
      </ChartCard>

      <ChartCard
        title="Embarques en el tiempo"
        description="Evolución de los embarques registrados"
        className="lg:col-span-2"
      >
        <div className="min-h-[280px]">
          <ShipmentTimelineChart data={timelineData} />
        </div>
      </ChartCard>
    </div>
  );
}