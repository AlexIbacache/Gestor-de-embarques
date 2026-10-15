"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import { CHART_STATUS_COLORS } from "@/components/dashboard/chart-colors";
import { SHIPMENT_STATUSES } from "@/lib/domain/shipments";

/**
 * Outside `name: value` labels are positioned at the donut's edge and are
 * clipped by the SVG viewport as soon as the card narrows — at 360px, and also
 * at `lg` where the dashboard grid puts this card in a half-width column. The
 * labels therefore live in a wrapping list under the donut instead: the text
 * reflows at any width, nothing is truncated, and the palette is unchanged.
 *
 * `counts` is the pre-aggregated `by_status` map from `get_dashboard_stats()`:
 * the server already grouped the rows, so this component only maps the domain
 * order and colours onto the counts.
 */
export function ShipmentStatusChart({
  counts,
}: {
  counts: Record<string, number>;
}) {
  const data = SHIPMENT_STATUSES.map((status) => ({
    name: status,
    value: counts[status] ?? 0,
    fill: CHART_STATUS_COLORS[status],
  })).filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
        No hay datos para mostrar
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius="42%"
            outerRadius="68%"
            labelLine={false}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      <ul
        aria-label="Detalle de embarques por estado"
        className="flex flex-col gap-1.5"
      >
        {data.map((entry) => (
          <li
            key={entry.name}
            className="flex items-center gap-2 text-xs text-muted-foreground"
          >
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: entry.fill }}
            />
            <span className="truncate">{entry.name}</span>
            <span className="ml-auto font-medium text-foreground">
              {entry.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
