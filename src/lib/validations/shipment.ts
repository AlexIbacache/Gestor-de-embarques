import { z } from "zod";

import {
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
});

export const shipmentIdSchema = z.object({
  id: z.string().trim().uuid("Identificador inválido"),
});

export type ShipmentInput = z.infer<typeof shipmentSchema>;
