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
 * Each status sits in its own colour family so no two slices can be mistaken
 * for each other, and they match the status badges: amber = pendiente, blue =
 * en tránsito, green = entregado, red-orange = retrasado, slate = cancelado.
 * The modality series use three separate hues (blue, teal, violet).
 */
export const CHART_STATUS_COLORS: Record<ShipmentStatus, string> = {
  Pendiente: "var(--pending)",
  "En tránsito": "var(--info)",
  Entregado: "var(--success)",
  Retrasado: "var(--danger)",
  Cancelado: "var(--neutral)",
};

export const CHART_MODALITY_COLORS: Record<ShipmentModality, string> = {
  FCL: "var(--chart-1)",
  LCL: "var(--chart-2)",
  AIR: "var(--chart-3)",
};

/** Ocean-blue primary used for the timeline stroke and its gradient fill. */
export const CHART_PRIMARY_COLOR = "var(--primary)";
