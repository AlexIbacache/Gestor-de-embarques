import { Check, ChevronsRight, Circle, TriangleAlert, X, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { ShipmentStatus } from "@/lib/domain/shipments";

/**
 * Single source of truth for shipment status colours. They come from the theme
 * tokens in `globals.css` (`pending`/`warning`, `info`, `success`, `danger`, `neutral`), so the
 * badges, the dashboard charts and the dark theme all share one palette:
 * `Pendiente` amber, `En tránsito` ocean blue, `Entregado` green,
 * `Retrasado` red-orange (the alert colour), `Cancelado` slate grey.
 * Exported so the table, the form select and the detail view render the same
 * colours instead of duplicating class strings.
 *
 * `Record<ShipmentStatus, ...>` makes the compiler reject the map the moment a
 * sixth status is added to `src/lib/domain/shipments.ts`: a new status must pick
 * a colour and a symbol here or the build breaks.
 *
 * The values are full literal class strings (no interpolation), so Tailwind 4's
 * static extractor sees every candidate.
 */
export const SHIPMENT_STATUS_STYLES: Record<ShipmentStatus, string> = {
  Pendiente: "bg-pending/20 text-warning",
  "En tránsito": "bg-info/12 text-info",
  Entregado: "bg-success/12 text-success",
  Retrasado: "bg-danger/12 text-danger",
  Cancelado: "bg-neutral/12 text-neutral line-through decoration-1",
};

/**
 * Each status also has its own symbol, so the state never depends on colour
 * alone (colour-blind users, greyscale prints).
 */
export const SHIPMENT_STATUS_ICONS: Record<ShipmentStatus, LucideIcon> = {
  Pendiente: Circle,
  "En tránsito": ChevronsRight,
  Entregado: Check,
  Retrasado: TriangleAlert,
  Cancelado: X,
};

/**
 * Status pill for a shipment. Plain Server Component: the classes are static
 * and `Badge` adds no interactivity, so this stays usable from both Server and
 * Client Components without a `"use client"` boundary.
 *
 * The label is rendered verbatim from `status`, which keeps accents (e.g. the
 * in-transit value) intact. The `shipments_status_check` CHECK constraint in
 * `supabase/schema.sql` stores the same literals — the database enforces the
 * same domain the canonical module in `src/lib/domain/shipments.ts` defines.
 */
export function ShipmentStatusBadge({ status }: { status: ShipmentStatus }) {
  const Icon = SHIPMENT_STATUS_ICONS[status];

  return (
    <Badge variant="secondary" className={SHIPMENT_STATUS_STYLES[status]}>
      <Icon data-icon="inline-start" aria-hidden="true" />
      {status}
    </Badge>
  );
}