import type { ShipmentModality, ShipmentStatus } from "@/types/database";

/**
 * Single source of truth for the dashboard chart palette.
 *
 * Every value references a CSS custom property emitted by `@theme inline` in
 * `globals.css`, so the three charts follow the corporate palette (and its
 * light/dark variants) without hardcoding a hex or a Tailwind color here.
 *
 * Status hues stay meaning-driven; the categorical hues (modality, timeline)
 * use the corporate blue/sky/gray scale.
 */
export const CHART_STATUS_COLORS: Record<ShipmentStatus, string> = {
  Pendiente: "var(--color-neutral)",
  "En tránsito": "var(--color-chart-2)",
  Entregado: "var(--color-success)",
  Retrasado: "var(--color-danger)",
  Cancelado: "var(--color-muted-foreground)",
};

export const CHART_MODALITY_COLORS: Record<ShipmentModality, string> = {
  FCL: "var(--color-chart-1)",
  LCL: "var(--color-chart-2)",
  AIR: "var(--color-chart-4)",
};

/** Corporate primary used for the timeline stroke and its gradient fill. */
export const CHART_PRIMARY_COLOR = "var(--color-primary)";
