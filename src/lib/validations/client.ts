import { z } from "zod";

export const clientSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  email: z.string().trim().email("Ingresá un email válido"),
  company: z.string().trim().min(1, "La empresa es obligatoria"),
});

export type ClientInput = z.infer<typeof clientSchema>;
