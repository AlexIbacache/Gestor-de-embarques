"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts";

import { CHART_MODALITY_COLORS } from "@/components/dashboard/chart-colors";
import { SHIPMENT_MODALITIES } from "@/lib/domain/shipments";

/**
 * Abbreviates large axis values (`1200` -> `1.2k`) so a wide numeric tick can
 * never collide with its neighbour on a narrow chart. Small counts pass
 * through unchanged.
 */
function formatCountTick(value: number): string {
  return value >= 1000 ? `${value / 1000}k` : String(value);
}

/**
 * `counts` is the pre-aggregated `by_modality` map from
 * `get_dashboard_stats()`; the grouping already happened in PostgreSQL.
 */
export function ShipmentModalityChart({
  counts,
  compact = false,
}: {
  counts: Record<string, number>;
  compact?: boolean;
}) {
  const data = SHIPMENT_MODALITIES.map((modality) => ({
    name: modality,
    count: counts[modality] ?? 0,
    fill: CHART_MODALITY_COLORS[modality],
  })).filter((d) => d.count > 0);

  if (data.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
        No hay datos para mostrar
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={compact ? 240 : 280}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 16, bottom: 4, left: 0 }}
      >
        <XAxis
          type="number"
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatCountTick}
          interval="preserveStartEnd"
          tick={{ fill: "var(--muted-foreground)" }}
        />
        {/* `interval={0}` keeps every category label: there are only three and
            they must never be dropped. */}
        <YAxis
          type="category"
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tickMargin={8}
          interval={0}
          tick={{ fill: "var(--muted-foreground)" }}
        />
        <Bar
          dataKey="count"
          name="Embarques"
          radius={[4, 4, 0, 0]}
          barSize={compact ? 28 : 40}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
