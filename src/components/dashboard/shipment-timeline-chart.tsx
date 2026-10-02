"use client";

import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import React from "react";

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

  // Gradient definition - using defs prop with type assertion for Recharts
  const gradientId = "timeline-gradient";
  const defs = (
    <defs>
      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--color-success)" stopOpacity={0.3} />
        <stop offset="100%" stopColor="var(--color-success)" stopOpacity={0} />
      </linearGradient>
    </defs>
  );

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart
        data={chartData}
        margin={{ top: 10, right: 10, bottom: 0, left: 0 }}
        // @ts-expect-error - defs is supported by Recharts but not in TypeScript types
        defs={defs}
      >
        <XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={8} />
        <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
        <Area
          type="monotone"
          dataKey="count"
          name="Embarques"
          stroke="var(--color-success)"
          fill={`url(#${gradientId})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
