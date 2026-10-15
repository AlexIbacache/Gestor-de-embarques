/**
 * Single source of truth for the shipment domain values (design decision D18).
 *
 * Everything that needs the list of statuses or modalities imports it from here:
 * the Zod schemas (`src/lib/validations/shipment.ts`), the TypeScript types
 * (`src/types/database.ts`), the dashboard charts and colours, the shipment
 * form and filters, the status filters in `dashboard/page.tsx` and the seed
 * (`supabase/seed.sql`). The values MUST NOT be re-declared anywhere else.
 *
 * The arrays are `as const`, so the derived types below are the exact string
 * unions and the DB `CHECK` constraints can mirror these same literals.
 *
 * Ordering is part of the contract: it drives the `<Select>` filters and the
 * dashboard chart iteration, so append new values instead of reordering.
 */

/**
 * Named status constants. Code that means a specific status (e.g. the dashboard
 * "in transit" / "delayed" filters) references these names instead of a
 * positional index, so reordering {@link SHIPMENT_STATUSES} can never silently
 * change which status a filter targets.
 */
export const SHIPMENT_STATUS = {
  PENDING: "Pendiente",
  IN_TRANSIT: "En tránsito",
  DELIVERED: "Entregado",
  DELAYED: "Retrasado",
  CANCELLED: "Cancelado",
} as const;

/**
 * Ordered so the `<Select>` filters and chart legends can iterate it directly.
 * Derived from {@link SHIPMENT_STATUS}, so the string literals exist in exactly
 * one place while this array keeps the canonical display order.
 */
export const SHIPMENT_STATUSES = [
  SHIPMENT_STATUS.PENDING,
  SHIPMENT_STATUS.IN_TRANSIT,
  SHIPMENT_STATUS.DELIVERED,
  SHIPMENT_STATUS.DELAYED,
  SHIPMENT_STATUS.CANCELLED,
] as const;

/** Ordered so the `<Select>` filters and chart legends can iterate it directly. */
export const SHIPMENT_MODALITIES = ["FCL", "LCL", "AIR"] as const;

export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export type ShipmentModality = (typeof SHIPMENT_MODALITIES)[number];
