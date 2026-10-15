"use client";

import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import React from "react";

import { CHART_PRIMARY_COLOR } from "@/components/dashboard/chart-colors";
import { parseCalendarDate } from "@/lib/utils";

/**
 * `oct 2026` -> `oct 26`. With many month buckets on a narrow chart, dropping
 * the century keeps each tick short enough that `preserveStartEnd` can space
 * the surviving labels without overlap.
 */
function formatCompactMonthTick(value: string): string {
  return value.replace(/(\d{4})$/, (year) => year.slice(2));
}

/**
 * `buckets` are the pre-aggregated monthly counts from
 * `get_dashboard_stats()` — the server already grouped by
 * `date_trunc('month', created_at)` and keyed each bucket `AAAA-MM`, so no
 * aggregation happens here.
 */
export function ShipmentTimelineChart({
  buckets,
  compact = false,
}: {
  buckets: { month: string; count: number }[];
  compact?: boolean;
}) {
  const chartData = [...buckets]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(({ month, count }) => ({
      // `month` is a `yyyy-mm` bucket key; parse `yyyy-mm-01` as a LOCAL calendar
      // date so the label stays in the right month in negative UTC offsets
      // (design decision D20).
      month: parseCalendarDate(`${month}-01`).toLocaleDateString("es", {
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

  const gradientId = "timeline-gradient";

  return (
    <ResponsiveContainer width="100%" height={compact ? 240 : 280}>
      <AreaChart
        data={chartData}
        margin={{ top: 10, right: compact ? 16 : 10, bottom: 0, left: 0 }}
      >
        {/* `<defs>` is a direct SVG child: Recharts pushes every plain SVG
            element through `renderByOrder` unchanged, so the gradient renders
            without a `defs` prop (which is absent from Recharts' TypeScript
            surface). That is why no compiler suppression is needed here. */}
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_PRIMARY_COLOR} stopOpacity={0.3} />
            <stop offset="100%" stopColor={CHART_PRIMARY_COLOR} stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Density adapts at every width: `preserveStartEnd` keeps the edges and
            drops any interior tick that would violate `minTickGap`, so this is
            safe at 360px (edge labels only), 768px (sidebar shrinks the card to
            ~400px) and 1280px (every bucket fits and is shown). The compact
            formatter additionally shortens `oct 2026` to `oct 26`. */}
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tickMargin={8}
          interval="preserveStartEnd"
          minTickGap={compact ? 24 : 16}
          tickFormatter={compact ? formatCompactMonthTick : undefined}
          tick={{ fill: "var(--muted-foreground)" }}
        />
        <YAxis
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--muted-foreground)" }}
        />
        <Area
          type="monotone"
          dataKey="count"
          name="Embarques"
          stroke={CHART_PRIMARY_COLOR}
          fill={`url(#${gradientId})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
