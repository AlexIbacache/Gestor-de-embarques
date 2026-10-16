import { z } from "zod";

import {
  SHIPMENT_MILESTONES,
  SHIPMENT_MODALITIES,
  SHIPMENT_STATUSES,
} from "@/lib/domain/shipments";

export const shipmentSchema = z.object({
  reference: z.string().trim().min(1, "La referencia es obligatoria"),
  client_id: z.string().trim().uuid("Seleccioná un cliente"),
  origin: z.string().trim().min(1, "El origen es obligatorio"),
  destination: z.string().trim().min(1, "El destino es obligatorio"),
  modality: z.enum(SHIPMENT_MODALITIES, {
    error: "Seleccioná una modalidad",
  }),
  status: z.enum(SHIPMENT_STATUSES, {
    error: "Seleccioná un estado",
  }),
  eta: z
    .string()
    .min(1, "La ETA es obligatoria")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La ETA debe tener el formato AAAA-MM-DD"),
  // Optional free text; the form sends "" when empty and the action stores NULL.
  // 1000 mirrors `shipments_notes_length_check` in supabase/schema.sql.
  notes: z
    .string()
    .trim()
    .max(1000, "Las notas admiten hasta 1000 caracteres")
    .optional(),
});

export const shipmentIdSchema = z.object({
  id: z.string().trim().uuid("Identificador inválido"),
});

/** `""` (empty date input) becomes `null`; anything else must be `yyyy-mm-dd`. */
const optionalCalendarDate = z
  .union([
    z.literal(""),
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe tener el formato AAAA-MM-DD"),
  ])
  .transform((value) => (value === "" ? null : value));

export const milestoneUpdateSchema = z.object({
  shipment_id: z.string().trim().uuid("Identificador inválido"),
  name: z.enum(SHIPMENT_MILESTONES, { error: "Hito inválido" }),
  planned_date: optionalCalendarDate,
  actual_date: optionalCalendarDate,
});

export type ShipmentInput = z.infer<typeof shipmentSchema>;
export type MilestoneUpdateInput = z.input<typeof milestoneUpdateSchema>;
