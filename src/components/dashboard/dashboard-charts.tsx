"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShipmentStatusChart } from "./shipment-status-chart";
import { ShipmentModalityChart } from "./shipment-modality-chart";
import { ShipmentTimelineChart } from "./shipment-timeline-chart";

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
    <Card
      className={`
        group
        overflow-hidden
        rounded-2xl
        border
        border-black/[0.045]
        bg-white
        shadow-[0_2px_10px_rgba(0,0,0,0.025)]
        transition-all
        duration-200
        hover:border-black/[0.07]
        hover:shadow-[0_5px_18px_rgba(0,0,0,0.045)]
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