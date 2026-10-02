"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

const STATUSES = ["Pendiente", "En tránsito", "Entregado", "Retrasado", "Cancelado"] as const;

const STATUS_COLORS: Record<(typeof STATUSES)[number], string> = {
  Pendiente: "var(--color-neutral)",
  "En tránsito": "var(--color-warning)",
  Entregado: "var(--color-success)",
  Retrasado: "var(--color-danger)",
  Cancelado: "var(--color-muted-foreground)",
};

export function ShipmentStatusChart({ data }: { data: { status: string }[] }) {
  const counts = STATUSES.map((status) => ({
    name: status,
    value: data.filter((d) => d.status === status).length,
    fill: STATUS_COLORS[status],
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
