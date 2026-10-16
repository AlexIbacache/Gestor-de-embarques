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

/**
 * The five fixed milestones of a shipment, in execution order. The database
 * trigger `shipments_seed_milestones` creates them for every new shipment, and the
 * CHECK `shipment_milestones_name_step_check` in `supabase/schema.sql` mirrors
 * these literals and their 1-based position. The "En tránsito" step shown in the
 * UI is derived (Zarpe done, Arribo pending), never stored.
 */
export const SHIPMENT_MILESTONES = [
  "Reserva",
  "Ingreso a puerto",
  "Zarpe",
  "Arribo",
  "Entrega",
] as const;

export type ShipmentMilestoneName = (typeof SHIPMENT_MILESTONES)[number];

/** Kinds written to `shipment_events` by the database triggers. */
export const SHIPMENT_EVENT_KINDS = ["Creado", "Estado", "ETA", "Hito"] as const;

export type ShipmentEventKind = (typeof SHIPMENT_EVENT_KINDS)[number];

/**
 * Status the shipment should move to when a milestone is completed or reopened,
 * or `null` when the status must stay as it is.
 *
 * Keeps the status badge and the milestone timeline from contradicting each
 * other: completing Zarpe starts the transit, completing Entrega delivers the
 * shipment, and reopening either undoes only what that milestone had caused.
 * Cancelado is never touched, and a Retrasado shipment only leaves that status
 * when it is actually delivered (a late vessel is still late after it sails).
 */
export function statusAfterMilestoneChange(
  status: ShipmentStatus,
  milestone: ShipmentMilestoneName,
  wasDone: boolean,
  isDone: boolean,
): ShipmentStatus | null {
  if (wasDone === isDone) return null;

  if (isDone) {
    if (milestone === "Zarpe" && status === SHIPMENT_STATUS.PENDING) {
      return SHIPMENT_STATUS.IN_TRANSIT;
    }
    if (
      milestone === "Entrega" &&
      (status === SHIPMENT_STATUS.PENDING ||
        status === SHIPMENT_STATUS.IN_TRANSIT ||
        status === SHIPMENT_STATUS.DELAYED)
    ) {
      return SHIPMENT_STATUS.DELIVERED;
    }
    return null;
  }

  if (milestone === "Entrega" && status === SHIPMENT_STATUS.DELIVERED) {
    return SHIPMENT_STATUS.IN_TRANSIT;
  }
  if (milestone === "Zarpe" && status === SHIPMENT_STATUS.IN_TRANSIT) {
    return SHIPMENT_STATUS.PENDING;
  }
  return null;
}
