"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts";

const MODALITIES = ["FCL", "LCL", "AIR"];
const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];

export function ShipmentModalityChart({ data }: { data: { modality: string }[] }) {
  const counts = MODALITIES.map((modality, index) => ({
    name: modality,
    count: data.filter((d) => d.modality === modality).length,
    fill: COLORS[index],
  })).filter((d) => d.count > 0);

  if (counts.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
        No hay datos para mostrar
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={counts}>
        <XAxis dataKey="name" />
        <YAxis allowDecimals={false} />
        <Bar dataKey="count" name="Embarques" radius={[4, 4, 0, 0]}>
          {counts.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
