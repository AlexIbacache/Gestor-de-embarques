"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShipmentStatusChart } from "./shipment-status-chart";
import { ShipmentModalityChart } from "./shipment-modality-chart";
import { ShipmentTimelineChart } from "./shipment-timeline-chart";

export function DashboardCharts({
  statusData,
  modalityData,
  timelineData,
}: {
  statusData: { status: string }[];
  modalityData: { modality: string }[];
  timelineData: { created_at: string }[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Embarques por estado</CardTitle>
        </CardHeader>
        <CardContent>
          <ShipmentStatusChart data={statusData} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Embarques por modalidad</CardTitle>
        </CardHeader>
        <CardContent>
          <ShipmentModalityChart data={modalityData} />
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Embarques en el tiempo</CardTitle>
        </CardHeader>
        <CardContent>
          <ShipmentTimelineChart data={timelineData} />
        </CardContent>
      </Card>
    </div>
  );
}
