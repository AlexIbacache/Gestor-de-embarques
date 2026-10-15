/*
 * Domain unions live in the canonical module (D18) and derive from the `as
 * const` arrays there, so a new status/modality only has to be added once.
 * They are imported and re-exported so existing imports from `@/types/database`
 * keep working unchanged. `src/lib/domain/shipments.ts` must NOT import from
 * this file, which keeps the dependency one-way and avoids an import cycle.
 */
import type {
  ShipmentModality,
  ShipmentStatus,
} from "@/lib/domain/shipments";

export type { ShipmentStatus, ShipmentModality };

export type Client = {
  id: string;
  name: string;
  email: string;
  company: string;
  /** ISO 8601 timestamp (Postgres `timestamptz`). */
  created_at: string;
};

export type Shipment = {
  id: string;
  reference: string;
  client_id: string;
  origin: string;
  destination: string;
  modality: ShipmentModality;
  status: ShipmentStatus;
  /** ISO 8601 calendar date (`yyyy-mm-dd`). */
  eta: string;
  /** ISO 8601 timestamp (Postgres `timestamptz`). */
  created_at: string;
};

/**
 * A shipment row as returned by a Supabase query that embeds the `client`
 * relation. The join is nullable because RLS can hide the related client row.
 */
export type ShipmentWithClient = Shipment & {
  client: Client | null;
};
