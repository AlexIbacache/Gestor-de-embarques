"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { createClientAction, updateClientAction } from "@/app/actions/clientes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clientSchema } from "@/lib/validations/client";
import type { Client } from "@/types/database";

/**
 * `z.flattenError` types `fieldErrors` as `{ [field]?: string[] }`, which is not
 * assignable to a plain `Record<string, string[]>`. Fields with no issue are
 * dropped instead of being carried around as `undefined`.
 *
 * Deliberately duplicated from `src/app/actions/clientes.ts` rather than shared:
 * the two shapes (`Record<string, string[]>` from the action result and
 * `z.flattenError` here) are different, and a shared helper would need a third
 * module for six lines of pure code.
 */
function toFieldErrors<T>(error: z.ZodError<T>): Record<string, string[]> {
  const { fieldErrors } = z.flattenError(error);
  const result: Record<string, string[]> = {};

  // See the identical helper in `src/app/actions/clientes.ts`: the assertion is
  // what makes the optional-keyed mapped type iterable.
  const entries = Object.entries(
    fieldErrors as Record<string, string[] | undefined>,
  );

  for (const [field, messages] of entries) {
    if (messages && messages.length > 0) result[field] = messages;
  }

  return result;
}

type ClientFormProps = {
  /** Present → edit mode, absent → create mode. */
  client?: Client;
  onOpenChange?: (open: boolean) => void;
  /**
   * Optional controlled `open`, mirroring the Base UI `Dialog.Root` contract:
   * omitted means the form owns its own open state, which is only useful when a
   * trigger lives inside it. Pass it when the page owns the trigger.
   */
  open?: boolean;
};

/**
 * Create/edit form for a client, presented inside a dialog.
 *
 * Split in two on purpose: the dialog shell holds the open state and the stateful
 * form lives in `ClientFormBody` under `key={client?.id ?? "new"}`. Changing the
 * key unmounts the popup subtree and mounts a fresh one, so the field
 * initialisers re-run against the new `client`. Copying `client` into state from
 * a `useEffect` instead would render one frame carrying the previous client's
 * values, and would need a mount guard to avoid overwriting an edit in progress.
 */
export function ClientForm({ client, onOpenChange, open: openProp }: ClientFormProps) {
  const isControlled = openProp !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = isControlled ? openProp : uncontrolledOpen;

  function handleOpenChange(nextOpen: boolean) {
    if (!isControlled) setUncontrolledOpen(nextOpen);
    onOpenChange?.(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent key={client?.id ?? "new"}>
        <ClientFormBody client={client} onClose={handleOpenChange} />
      </DialogContent>
    </Dialog>
  );
}

function ClientFormBody({
  client,
  onClose,
}: {
  client?: Client;
  onClose: (open: boolean) => void;
}) {
  const [name, setName] = useState(client?.name ?? "");
  const [email, setEmail] = useState(client?.email ?? "");
  const [company, setCompany] = useState(client?.company ?? "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isPending, startTransition] = useTransition();

  const isEdit = client !== undefined;

  function errorMessage(field: string): string | undefined {
    return fieldErrors[field]?.[0];
  }

  function resetFields() {
    setName("");
    setEmail("");
    setCompany("");
    setFieldErrors({});
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // The disabled submit button is the double-submit guard; this second check
    // covers a repeated Enter keypress, which fires submit without the button.
    if (isPending) return;

    // Validated with the same schema the action uses, so the messages rendered
    // under the inputs are the schema's own wording and the two can never
    // disagree about what is invalid.
    const parsed = clientSchema.safeParse({ name, email, company });

    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      return;
    }

    setFieldErrors({});

    startTransition(async () => {
      const result = client
        ? await updateClientAction({ ...parsed.data, id: client.id })
        : await createClientAction(parsed.data);

      if (result.success) {
        toast.success(
          isEdit
            ? "Cliente actualizado correctamente."
            : "Cliente creado correctamente.",
        );
        resetFields();
        onClose(false);
        return;
      }

      toast.error(result.error);

      // Server-side field errors are rendered inline too. A toast alone would
      // disappear on its own and leave the user guessing which input is wrong.
      if (result.fieldErrors) setFieldErrors(result.fieldErrors);
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? "Modificá los datos del cliente y confirmá para guardar los cambios."
            : "Completá los datos del cliente. Quedarán guardados al confirmar."}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
        <div className="grid gap-2">
          <Label htmlFor="client-name">Nombre</Label>
          <Input
            id="client-name"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nombre y apellido"
            autoComplete="name"
            aria-invalid={errorMessage("name") ? true : undefined}
            aria-describedby={
              errorMessage("name") ? "client-name-error" : undefined
            }
          />
          {errorMessage("name") ? (
            <p
              id="client-name-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {errorMessage("name")}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="client-email">Email</Label>
          <Input
            id="client-email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="nombre@empresa.com"
            autoComplete="email"
            aria-invalid={errorMessage("email") ? true : undefined}
            aria-describedby={
              errorMessage("email") ? "client-email-error" : undefined
            }
          />
          {errorMessage("email") ? (
            <p
              id="client-email-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {errorMessage("email")}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="client-company">Empresa</Label>
          <Input
            id="client-company"
            name="company"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            placeholder="Empresa S.A."
            autoComplete="organization"
            aria-invalid={errorMessage("company") ? true : undefined}
            aria-describedby={
              errorMessage("company") ? "client-company-error" : undefined
            }
          />
          {errorMessage("company") ? (
            <p
              id="client-company-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {errorMessage("company")}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            Cancelar
          </DialogClose>
          <Button type="submit" disabled={isPending}>
            {isPending
              ? "Guardando..."
              : isEdit
                ? "Guardar cambios"
                : "Crear cliente"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}