"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

import { updateMilestoneAction } from "@/app/actions/embarques";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ShipmentMilestone } from "@/types/database";

type MilestoneDialogProps = {
  shipmentId: string;
  milestone: Pick<ShipmentMilestone, "name" | "planned_date" | "actual_date">;
};

/**
 * `yyyy-mm-dd` for today in the *browser's* timezone, built from local getters.
 * `toISOString()` would answer in UTC and hand an evening user in a negative
 * offset tomorrow's date. Only called from a click handler, never during render,
 * so there is no server/client mismatch to worry about.
 */
function todayInputValue(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Edit button + dialog for one milestone's planned and actual dates.
 *
 * Base UI unmounts the popup subtree when it closes, so `MilestoneForm` re-runs
 * its `useState` initialisers from the current props on every open — the same
 * mechanism `ShipmentForm` relies on. No effect is needed to resync the fields.
 *
 * The trigger carries the milestone name in its accessible name: a page with
 * five buttons that all say "Editar" is unusable with a screen reader.
 */
export function MilestoneDialog({ shipmentId, milestone }: MilestoneDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Editar hito ${milestone.name}`}
          />
        }
      >
        <Pencil data-icon="inline-start" aria-hidden="true" />
        Editar
      </DialogTrigger>
      <DialogContent>
        <MilestoneForm
          shipmentId={shipmentId}
          milestone={milestone}
          onClose={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function MilestoneForm({
  shipmentId,
  milestone,
  onClose,
}: MilestoneDialogProps & { onClose: () => void }) {
  const [planned, setPlanned] = useState(milestone.planned_date ?? "");
  const [actual, setActual] = useState(milestone.actual_date ?? "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;

    setFieldErrors({});

    startTransition(async () => {
      const result = await updateMilestoneAction({
        shipment_id: shipmentId,
        name: milestone.name,
        planned_date: planned,
        actual_date: actual,
      });

      if (result.success) {
        toast.success(`Hito «${milestone.name}» actualizado.`);
        onClose();
        return;
      }

      toast.error(result.error);
      if (result.fieldErrors) setFieldErrors(result.fieldErrors);
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Hito: {milestone.name}</DialogTitle>
        <DialogDescription>
          Registrá cuándo estaba previsto y cuándo ocurrió realmente. Dejá la
          fecha real vacía si el hito todavía no se cumplió.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
        <div className="grid gap-2">
          <Label htmlFor="milestone-planned">Fecha prevista</Label>
          <Input
            id="milestone-planned"
            type="date"
            value={planned}
            onChange={(event) => setPlanned(event.target.value)}
            disabled={isPending}
            aria-invalid={fieldErrors.planned_date ? true : undefined}
          />
          {fieldErrors.planned_date?.[0] ? (
            <p role="alert" className="text-sm text-destructive">
              {fieldErrors.planned_date[0]}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="milestone-actual">Fecha real</Label>
          <div className="flex gap-2">
            <Input
              id="milestone-actual"
              type="date"
              value={actual}
              onChange={(event) => setActual(event.target.value)}
              disabled={isPending}
              aria-invalid={fieldErrors.actual_date ? true : undefined}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setActual(todayInputValue())}
              disabled={isPending}
            >
              Hoy
            </Button>
          </div>
          {fieldErrors.actual_date?.[0] ? (
            <p role="alert" className="text-sm text-destructive">
              {fieldErrors.actual_date[0]}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <DialogClose
            render={<Button type="button" variant="outline" disabled={isPending} />}
          >
            Cancelar
          </DialogClose>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
