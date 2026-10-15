import type { ShipmentModality, ShipmentStatus } from "@/lib/domain/shipments";

/**
 * Single source of truth for the dashboard chart palette.
 *
 * Every value references a base CSS custom property declared in BOTH `:root`
 * and `.dark` in `globals.css`, so the three charts resolve the palette of the
 * active theme. The Tailwind `--color-*` aliases from `@theme inline` are
 * emitted only once on `:root`; pointing the charts at the base tokens instead
 * makes it explicit that the declaration the `.dark` block overrides is the one
 * each SVG element resolves. No hex is hardcoded here.
 *
 * Status hues stay meaning-driven; the categorical hues (modality, timeline)
 * follow the logistics palette (deep navy/steel + amber + slate).
 */
export const CHART_STATUS_COLORS: Record<ShipmentStatus, string> = {
  Pendiente: "var(--neutral)",
  "En tránsito": "var(--chart-2)",
  Entregado: "var(--success)",
  Retrasado: "var(--danger)",
  Cancelado: "var(--muted-foreground)",
};

export const CHART_MODALITY_COLORS: Record<ShipmentModality, string> = {
  FCL: "var(--chart-1)",
  LCL: "var(--chart-2)",
  AIR: "var(--chart-4)",
};

/** Deep navy/steel primary used for the timeline stroke and its gradient fill. */
export const CHART_PRIMARY_COLOR = "var(--primary)";
