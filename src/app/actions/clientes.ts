"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { clientSchema, type ClientInput } from "@/lib/validations/client";
import type { Client } from "@/types/database";

/**
 * Re-exported so the client form types its action results without reaching into
 * the auth module. This is `export type`, not `export {}`: it is erased at
 * compile time, so this file still emits nothing but async functions, which is
 * the only thing a `"use server"` module is allowed to export.
 */
export type { ActionResult } from "@/app/actions/auth";

const CLIENTS_PATH = "/clientes";

const UNAUTHORIZED_ERROR = "No tenés autorización para realizar esta operación.";
const INVALID_INPUT_ERROR = "Revisá los datos ingresados.";
const CLIENT_NOT_FOUND_ERROR =
  "El cliente que estás editando ya no existe. Actualizá la página e intentá de nuevo.";
const MUTATION_FAILED_ERROR = "No pudimos guardar el cliente. Intentá de nuevo.";

/**
 * Validates the *target* of an update, not the client payload, which is why it
 * lives here instead of in `src/lib/validations/client.ts`: `clientSchema`
 * describes the fields both actions write, and an `id` is only ever accepted by
 * `updateClientAction`.
 *
 * `z.string().trim().uuid(...)` instead of the top-level `z.uuid(...)` because
 * the trim has to run before the format check, and because the sibling
 * `clientSchema` uses the same string-method style. zod v4 marks the method form
 * deprecated in favour of `z.uuid()`; the behaviour is identical here.
 */
const clientIdSchema = z.object({
  id: z.string().trim().uuid("Identificador inválido"),
});

/**
 * Postgres/PostgREST status codes mapped to UI copy.
 *
 * Only the *code* is inspected, never the message: Supabase error strings are
 * English, can name internal details (constraint names, RLS policy names) and are
 * never valid UI copy. Anything unmapped falls back to a generic message rather
 * than leaking the raw error.
 */
const SUPABASE_ERROR_MESSAGES: Record<string, string> = {
  "23502": "Faltan datos obligatorios para guardar el cliente.",
  "23503": "No se puede guardar el cliente porque tiene registros relacionados.",
  "23505": "Ya existe un cliente con esos datos.",
  "23514": "Los datos ingresados no cumplen las condiciones del sistema.",
  "42501": UNAUTHORIZED_ERROR,
};

function mutationError(error: PostgrestError): string {
  return SUPABASE_ERROR_MESSAGES[error.code] ?? MUTATION_FAILED_ERROR;
}

/**
 * `z.flattenError` (zod v4) types `fieldErrors` as `{ [field]?: string[] }`:
 * optional keys, which under `strict` is not assignable to the
 * `Record<string, string[]>` that `ActionResult` declares. The single assertion
 * below widens that mapped type to a lookup table so it can be iterated at all —
 * without it `Object.entries` cannot infer through a mapped type over an
 * unresolved generic. Fields with no issue are then dropped rather than emitted
 * as `undefined`, so callers can read `fieldErrors.email?.[0]` directly.
 */
function toFieldErrors<T>(error: z.ZodError<T>): Record<string, string[]> {
  const { fieldErrors } = z.flattenError(error);
  const result: Record<string, string[]> = {};

  const entries = Object.entries(
    fieldErrors as Record<string, string[] | undefined>,
  );

  for (const [field, messages] of entries) {
    if (messages && messages.length > 0) result[field] = messages;
  }

  return result;
}

export async function createClientAction(
  input: ClientInput,
): Promise<ActionResult<Client>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: UNAUTHORIZED_ERROR };

  const result = clientSchema.safeParse(input);

  if (!result.success) {
    return {
      success: false,
      error: INVALID_INPUT_ERROR,
      fieldErrors: toFieldErrors(result.error),
    };
  }

  const { name, email, company } = result.data;

  // Only the writable business columns are sent. `id` and `created_at` are
  // database defaults and are never accepted from the caller. `.select()` asks
  // PostgREST to return the row it actually inserted, so the response carries
  // the server-generated `id` and `created_at` instead of an echo of the input —
  // the clients table renders `created_at`, so echoing it back would render the
  // wrong date.
  const { data, error } = await supabase
    .from("clients")
    .insert({ name, email, company })
    .select()
    .single();

  if (error) return { success: false, error: mutationError(error) };

  // `createClient()` in `src/lib/supabase/server.ts` is built without the
  // generated `Database` generic, so PostgREST types `data` as `any`. The row is
  // re-typed once, at this single boundary, so `any` never reaches
  // `ActionResult<Client>`.
  const persisted = data as Client;

  revalidatePath(CLIENTS_PATH);

  return { success: true, data: persisted };
}

export async function updateClientAction(
  input: ClientInput & { id: string },
): Promise<ActionResult<Client>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: UNAUTHORIZED_ERROR };

  // Payload and id are validated independently so `clientSchema` keeps describing
  // the writable fields alone. `clientSchema` strips the extra `id` key rather
  // than rejecting it, so passing the whole input to both is safe.
  const body = clientSchema.safeParse(input);
  const target = clientIdSchema.safeParse(input);

  if (!body.success || !target.success) {
    return {
      success: false,
      error: INVALID_INPUT_ERROR,
      fieldErrors: {
        ...(body.success ? {} : toFieldErrors(body.error)),
        ...(target.success ? {} : toFieldErrors(target.error)),
      },
    };
  }

  const { name, email, company } = body.data;

  // `created_at` is deliberately not in the update payload: it is the creation
  // timestamp and must survive an edit unchanged.
  const { data, error } = await supabase
    .from("clients")
    .update({ name, email, company })
    .eq("id", target.data.id)
    .select()
    .single();

  if (error) {
    // PGRST116 is PostgREST reporting that `.eq("id", ...)` selected zero rows,
    // which `.single()` turns into an error. That is a "the row is gone" answer,
    // not a transport failure: the client was deleted between render and submit.
    // Everything else is a real failure and gets its own message.
    if (error.code === "PGRST116") {
      return { success: false, error: CLIENT_NOT_FOUND_ERROR };
    }

    return { success: false, error: mutationError(error) };
  }

  const persisted = data as Client;

  revalidatePath(CLIENTS_PATH);

  return { success: true, data: persisted };
}