import { Badge } from "@/components/ui/badge";
import type { ShipmentStatus } from "@/lib/domain/shipments";

/**
 * Single source of truth for shipment status colours, per the project UI
 * convention (updated to semantic palette): `Pendiente` slate/neutral,
 * `En tránsito` amber/warning, `Entregado` lime/success, `Retrasado` red/danger,
 * `Cancelado` gray/muted. Exported so the shipments table, the shipment form
 * select and the detail view all render the same colours instead of duplicating
 * class strings per component.
 *
 * `Record<ShipmentStatus, string>` makes the compiler reject the map the moment
 * a sixth status is added to the canonical union in
 * `src/lib/domain/shipments.ts`, which is the point: a new status must pick a
 * colour here or the build breaks.
 *
 * The values are full literal class strings (no `cva`, no interpolation), so
 * Tailwind 4's static extractor sees every candidate and emits them. Verified in
 * the production build output.
 */
export const SHIPMENT_STATUS_STYLES: Record<ShipmentStatus, string> = {
  Pendiente: "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
  "En tránsito": "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
  Entregado: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  Retrasado: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  Cancelado: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300",
};

/**
 * Status pill for a shipment. Plain Server Component: the classes are static
 * and `Badge` adds no interactivity, so this stays usable from both Server and
 * Client Components without a `"use client"` boundary.
 *
 * The label is rendered verbatim from `status`, which keeps accents (e.g. the
 * in-transit value) intact — the database check constraint stores the same string.
 */
export function ShipmentStatusBadge({ status }: { status: ShipmentStatus }) {
  return (
    <Badge variant="secondary" className={SHIPMENT_STATUS_STYLES[status]}>
      {status}
    </Badge>
  );
}