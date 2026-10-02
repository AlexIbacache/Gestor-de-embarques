"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer } from "recharts";

const STATUSES = ["Pendiente", "En tránsito", "Entregado", "Retrasado", "Cancelado"];
const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function ShipmentStatusChart({ data }: { data: { status: string }[] }) {
  const counts = STATUSES.map((status, index) => ({
    name: status,
    value: data.filter((d) => d.status === status).length,
    fill: COLORS[index],
  })).filter((d) => d.value > 0);

  if (counts.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
        No hay datos para mostrar
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={counts}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={80}
          label={({ name, value }) => `${name}: ${value}`}
        >
          {counts.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Pie>
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
