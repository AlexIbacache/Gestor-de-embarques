"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts";

const MODALITIES = ["FCL", "LCL", "AIR"] as const;

const MODALITY_COLORS: Record<(typeof MODALITIES)[number], string> = {
  FCL: "var(--color-success)",
  LCL: "var(--color-warning)",
  AIR: "var(--color-primary)",
};

export function ShipmentModalityChart({ data }: { data: { modality: string }[] }) {
  const counts = MODALITIES.map((modality) => ({
    name: modality,
    count: data.filter((d) => d.modality === modality).length,
    fill: MODALITY_COLORS[modality],
  })).filter((d) => d.count > 0);

  if (counts.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
        No hay datos para mostrar
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={counts} layout="vertical">
        <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tickMargin={16} />
        <Bar dataKey="count" name="Embarques" radius={[4, 4, 0, 0]} barSize={40}>
          {counts.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
