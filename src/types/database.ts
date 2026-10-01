export type ShipmentModality = "FCL" | "LCL" | "AIR";

export type ShipmentStatus =
  | "Pendiente"
  | "En tránsito"
  | "Entregado"
  | "Retrasado"
  | "Cancelado";

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
