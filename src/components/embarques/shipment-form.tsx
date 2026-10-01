"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";

import {
  createShipmentAction,
  updateShipmentAction,
} from "@/app/actions/embarques";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SHIPMENT_MODALITIES,
  SHIPMENT_STATUSES,
  shipmentSchema,
} from "@/lib/validations/shipment";
import type { Client, Shipment } from "@/types/database";

/**
 * `z.flattenError` types `fieldErrors` as `{ [field]?: string[] }`, which is not
 * assignable to a plain `Record<string, string[]>`. Fields with no issue are
 * dropped instead of being carried around as `undefined`.
 *
 * Deliberately duplicated from `src/app/actions/embarques.ts` rather than shared:
 * the two shapes (`Record<string, string[]>` from the action result and
 * `z.flattenError` here) are different, and a shared helper would need a third
 * module for six lines of pure code.
 */
function toFieldErrors<T>(error: z.ZodError<T>): Record<string, string[]> {
  const { fieldErrors } = z.flattenError(error);
  const result: Record<string, string[]> = {};

  // See the identical helper in `src/app/actions/embarques.ts`: the assertion is
  // what makes the optional-keyed mapped type iterable.
  const entries = Object.entries(
    fieldErrors as Record<string, string[] | undefined>,
  );

  for (const [field, messages] of entries) {
    if (messages && messages.length > 0) result[field] = messages;
  }

  return result;
}

/**
 * Company first, then the contact name: several people behind one company is
 * the normal case, so the leading word is the one that groups a long list. A
 * client with no `name` degrades to the company on its own instead of rendering
 * a dangling dash.
 */
function clientLabel(client: Client): string {
  return client.name ? `${client.company} — ${client.name}` : client.company;
}

/**
 * `eta` is a Postgres `date`, so PostgREST returns `yyyy-mm-dd` — precisely what
 * `<input type="date">` expects and precisely what `shipmentSchema` validates,
 * so the value is submitted with no conversion at all.
 *
 * Slicing to the first 10 characters also absorbs a `timestamptz` payload if the
 * column is ever migrated, and it deliberately avoids `new Date(eta)`: that
 * constructor parses `yyyy-mm-dd` as UTC midnight, which lands on the previous
 * day in every negative UTC offset — the same trap documented on `formatDate` in
 * `src/lib/utils.ts`. No parse, no offset, no drift.
 */
function toDateInputValue(eta: string): string {
  return eta.slice(0, 10);
}

type ShipmentFormProps = {
  /** Present → edit mode, absent → create mode. */
  shipment?: Shipment;
  /**
   * Required and handed in by the server page. This form deliberately does not
   * import `createClient` from `@/lib/supabase/server`: that would drag the
   * data layer into the client bundle. It receives the same fully formed
   * `Client` the clients table already holds, which is exactly the contract
   * `ClientForm` has with its single `client` prop.
   */
  clients: Client[];
  onOpenChange?: (open: boolean) => void;
  /**
   * Optional controlled `open`, mirroring the Base UI `Dialog.Root` contract:
   * omitted means the form owns its own open state, which is only useful when a
   * trigger lives inside it. Pass it when the page owns the trigger.
   */
  open?: boolean;
};

/**
 * Create/edit form for a shipment, presented inside a dialog.
 *
 * Split in two on purpose, for the same reason as `ClientForm`: the dialog shell
 * holds the open state and the stateful form lives in `ShipmentFormBody` under
 * `key={shipment?.id ?? "new"}`. The `key` sits on `DialogContent`, so changing
 * it unmounts the popup subtree below it and mounts a fresh one, and every
 * `useState` initialiser re-runs against the new shipment. Copying `shipment`
 * into state from a `useEffect` instead would render one frame carrying the
 * previous shipment's values.
 */
export function ShipmentForm({
  shipment,
  clients,
  onOpenChange,
  open: openProp,
}: ShipmentFormProps) {
  const isControlled = openProp !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = isControlled ? openProp : uncontrolledOpen;

  function handleOpenChange(nextOpen: boolean) {
    if (!isControlled) setUncontrolledOpen(nextOpen);
    onOpenChange?.(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent key={shipment?.id ?? "new"}>
        <ShipmentFormBody
          shipment={shipment}
          clients={clients}
          onClose={handleOpenChange}
        />
      </DialogContent>
    </Dialog>
  );
}

function ShipmentFormBody({
  shipment,
  clients,
  onClose,
}: {
  shipment?: Shipment;
  clients: Client[];
  onClose: (open: boolean) => void;
}) {
  const [reference, setReference] = useState(shipment?.reference ?? "");
  const [clientId, setClientId] = useState<string | null>(
    shipment?.client_id ?? null,
  );
  const [origin, setOrigin] = useState(shipment?.origin ?? "");
  const [destination, setDestination] = useState(shipment?.destination ?? "");
  // Kept as `string | null` rather than the `ShipmentModality` / `ShipmentStatus`
  // unions: the Select only knows it holds a string, and `shipmentSchema` is the
  // single place allowed to decide which strings are real values.
  const [modality, setModality] = useState<string | null>(
    shipment?.modality ?? null,
  );
  const [status, setStatus] = useState<string | null>(shipment?.status ?? null);
  const [eta, setEta] = useState(shipment ? toDateInputValue(shipment.eta) : "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isPending, startTransition] = useTransition();

  const isEdit = shipment !== undefined;
  const hasClients = clients.length > 0;

  /**
   * Base UI `Select` stores the raw `value` and needs `items` to map it back to
   * the label shown inside the trigger. Without this map the client trigger
   * would print the raw uuid, since nothing else in the tree knows the label.
   */
  const clientItems = clients.map((client) => ({
    value: client.id,
    label: clientLabel(client),
  }));
  const modalityItems = SHIPMENT_MODALITIES.map((item) => ({
    value: item,
    label: item,
  }));
  const statusItems = SHIPMENT_STATUSES.map((item) => ({
    value: item,
    label: item,
  }));

  function errorMessage(field: string): string | undefined {
    return fieldErrors[field]?.[0];
  }

  function resetFields() {
    setReference("");
    setClientId(null);
    setOrigin("");
    setDestination("");
    setModality(null);
    setStatus(null);
    setEta("");
    setFieldErrors({});
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // The disabled submit button is the double-submit guard; this second check
    // covers a repeated Enter keypress, which fires submit without the button.
    if (isPending) return;

    // Validated with the same schema the action uses, so the messages rendered
    // under the fields are the schema's own wording and the two can never
    // disagree about what is invalid. `client_id`, `modality` and `status` arrive
    // as `null` while unselected, and `null` collapses to `""` so the schema's
    // "Seleccioná ..." messages — not a hand-written branch — reach the user.
    const parsed = shipmentSchema.safeParse({
      reference,
      client_id: clientId ?? "",
      origin,
      destination,
      modality,
      status,
      eta,
    });

    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      return;
    }

    setFieldErrors({});

    startTransition(async () => {
      const result = shipment
        ? await updateShipmentAction({ ...parsed.data, id: shipment.id })
        : await createShipmentAction(parsed.data);

      if (result.success) {
        toast.success(
          isEdit
            ? "Embarque actualizado correctamente."
            : "Embarque creado correctamente.",
        );
        resetFields();
        onClose(false);
        return;
      }

      toast.error(result.error);

      // Server-side field errors are rendered inline too. A toast alone would
      // disappear on its own and leave the user guessing which field is wrong.
      if (result.fieldErrors) setFieldErrors(result.fieldErrors);
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {isEdit ? "Editar embarque" : "Nuevo embarque"}
        </DialogTitle>
        <DialogDescription>
          {isEdit
            ? "Modificá los datos del embarque y confirmá para guardar los cambios."
            : "Completá los datos del embarque. Quedarán guardados al confirmar."}
        </DialogDescription>
      </DialogHeader>

      {/* `noValidate`: the native constraint validation API would report the
          browser's own English messages and skip the schema's Spanish ones.
          Every control is `disabled` while pending, so the form is genuinely
          inert during the request. */}
      <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
        <div className="grid gap-2">
          <Label htmlFor="shipment-reference">Referencia</Label>
          <Input
            id="shipment-reference"
            name="reference"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder="REF-2026-001"
            disabled={isPending}
            aria-invalid={errorMessage("reference") ? true : undefined}
            aria-describedby={
              errorMessage("reference") ? "shipment-reference-error" : undefined
            }
          />
          {errorMessage("reference") ? (
            <p
              id="shipment-reference-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {errorMessage("reference")}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="shipment-client">Cliente</Label>
          {hasClients ? (
            <Select
              // `id` on the Root is what the trigger renders (`idProp ?? rootId`),
              // so this is the control `<Label htmlFor>` points at. `name` feeds
              // the visually-hidden input that mirrors the value into a native
              // form submission; `required` reaches the trigger as
              // `aria-required`.
              id="shipment-client"
              name="client_id"
              required
              disabled={isPending}
              items={clientItems}
              value={clientId}
              onValueChange={setClientId}
            >
              <SelectTrigger
                className="w-full"
                aria-invalid={errorMessage("client_id") ? true : undefined}
                aria-describedby={
                  errorMessage("client_id")
                    ? "shipment-client-error"
                    : undefined
                }
              >
                <SelectValue placeholder="Seleccioná un cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {clientLabel(client)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            // An empty dropdown would look identical to a select whose value
            // simply failed to load, and the form would look submittable while
            // the database rejects it with a foreign key error. Saying why is
            // the whole point of this branch.
            <p className="text-sm text-muted-foreground">
              Todavía no hay clientes cargados. Creá un cliente antes de registrar
              un embarque.
            </p>
          )}
          {errorMessage("client_id") ? (
            <p
              id="shipment-client-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {errorMessage("client_id")}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="shipment-origin">Origen</Label>
          {/* `autoComplete="off"`: without it the browser is free to fill an
              address into a port/city field, which is almost never the value the
              user means. */}
          <Input
            id="shipment-origin"
            name="origin"
            value={origin}
            onChange={(event) => setOrigin(event.target.value)}
            placeholder="Puerto de Buenos Aires"
            autoComplete="off"
            disabled={isPending}
            aria-invalid={errorMessage("origin") ? true : undefined}
            aria-describedby={
              errorMessage("origin") ? "shipment-origin-error" : undefined
            }
          />
          {errorMessage("origin") ? (
            <p
              id="shipment-origin-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {errorMessage("origin")}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="shipment-destination">Destino</Label>
          <Input
            id="shipment-destination"
            name="destination"
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
            placeholder="Puerto de Hamburgo"
            autoComplete="off"
            disabled={isPending}
            aria-invalid={errorMessage("destination") ? true : undefined}
            aria-describedby={
              errorMessage("destination")
                ? "shipment-destination-error"
                : undefined
            }
          />
          {errorMessage("destination") ? (
            <p
              id="shipment-destination-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {errorMessage("destination")}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="shipment-modality">Modalidad</Label>
          <Select
            id="shipment-modality"
            name="modality"
            required
            disabled={isPending}
            items={modalityItems}
            value={modality}
            onValueChange={setModality}
          >
            <SelectTrigger
              className="w-full"
              aria-invalid={errorMessage("modality") ? true : undefined}
              aria-describedby={
                errorMessage("modality") ? "shipment-modality-error" : undefined
              }
            >
              <SelectValue placeholder="Seleccioná una modalidad" />
            </SelectTrigger>
            <SelectContent>
              {SHIPMENT_MODALITIES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errorMessage("modality") ? (
            <p
              id="shipment-modality-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {errorMessage("modality")}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="shipment-status">Estado</Label>
          <Select
            id="shipment-status"
            name="status"
            required
            disabled={isPending}
            items={statusItems}
            value={status}
            onValueChange={setStatus}
          >
            <SelectTrigger
              className="w-full"
              aria-invalid={errorMessage("status") ? true : undefined}
              aria-describedby={
                errorMessage("status") ? "shipment-status-error" : undefined
              }
            >
              <SelectValue placeholder="Seleccioná un estado" />
            </SelectTrigger>
            <SelectContent>
              {SHIPMENT_STATUSES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errorMessage("status") ? (
            <p
              id="shipment-status-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {errorMessage("status")}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="shipment-eta">ETA</Label>
          {/* No `min`. A past ETA is legitimate data — a `Retrasado` shipment's
              estimated arrival is exactly that — and pinning `min` to today would
              render the untouched record of one as invalid the moment it is
              opened for editing. It would also mean reading the clock during
              render, which can differ between the server and the browser and
              produce a one-day hydration mismatch. The schema, not the widget,
              owns what a valid ETA is. */}
          <Input
            id="shipment-eta"
            name="eta"
            type="date"
            value={eta}
            onChange={(event) => setEta(event.target.value)}
            disabled={isPending}
            aria-invalid={errorMessage("eta") ? true : undefined}
            aria-describedby={
              errorMessage("eta") ? "shipment-eta-error" : undefined
            }
          />
          {errorMessage("eta") ? (
            <p
              id="shipment-eta-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {errorMessage("eta")}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            Cancelar
          </DialogClose>
          <Button type="submit" disabled={isPending || !hasClients}>
            {isPending
              ? "Guardando..."
              : isEdit
                ? "Guardar cambios"
                : "Crear embarque"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
