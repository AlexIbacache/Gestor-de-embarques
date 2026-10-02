"use client";

import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

export function ShipmentTimelineChart({ data }: { data: { created_at: string }[] }) {
  const monthly = data.reduce(
    (acc, d) => {
      const month = d.created_at.slice(0, 7);
      acc[month] = (acc[month] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const chartData = Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({
      month: new Date(`${month}-01`).toLocaleDateString("es", {
        month: "short",
        year: "numeric",
      }),
      count,
    }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
        No hay datos para mostrar
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={chartData}>
        <XAxis dataKey="month" />
        <YAxis allowDecimals={false} />
        <Area
          type="monotone"
          dataKey="count"
          name="Embarques"
          stroke="var(--chart-1)"
          fill="var(--chart-1)"
          fillOpacity={0.2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
