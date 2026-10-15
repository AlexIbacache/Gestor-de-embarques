"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import { CHART_STATUS_COLORS } from "@/components/dashboard/chart-colors";
import { SHIPMENT_STATUSES } from "@/lib/domain/shipments";

export function ShipmentStatusChart({ data }: { data: { status: string }[] }) {
  const counts = SHIPMENT_STATUSES.map((status) => ({
    name: status,
    value: data.filter((d) => d.status === status).length,
    fill: CHART_STATUS_COLORS[status],
  })).filter((d) => d.value > 0);

  if (counts.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
        No hay datos para mostrar
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={counts}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          label={({ name, value }) => `${name}: ${value}`}
          labelLine={false}
        >
          {counts.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
