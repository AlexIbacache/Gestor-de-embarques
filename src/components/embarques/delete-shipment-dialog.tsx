"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { ActionResult } from "@/app/actions/embarques";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type DeleteShipmentDialogProps = {
  /**
   * Row being targeted. `deleteShipmentAction` takes `{ id }`, and `reference` is
   * a display label — it cannot identify the row, which is why `shipmentId`
   * exists alongside it rather than the reference being derived from the id.
   */
  shipmentId: string;
  /** Human-readable label shown in the question, so the row is unambiguous. */
  shipmentReference: string;
  /**
   * Controlled open state, for the same reason `ClientForm` and `ShipmentForm`
   * are controlled: the trigger is a per-row button rendered *outside* this
   * component, so the dialog cannot own its own open state.
   */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Performs the delete. Injected so the dialog stays presentational. */
  onConfirm: (id: string) => Promise<ActionResult<{ id: string }>>;
};

/**
 * Confirmation dialog for a destructive action.
 *
 * Two properties of the Base UI `AlertDialog` wrapper in
 * `src/components/ui/alert-dialog.tsx` shape this component:
 *
 * 1. `AlertDialogAction` is a plain `Button`, **not** `Close` (only
 *    `AlertDialogCancel` wraps `AlertDialogPrimitive.Close`). Clicking confirm
 *    therefore closes nothing by itself — this component owns the close, which
 *    is exactly what is needed to close on success and *stay open* on failure.
 * 2. Escape closes the dialog (unlike an outside click, which Base UI
 *    disables for alert dialogs). `handleOpenChange` ignores it while pending so
 *    a delete in flight cannot disappear behind the user's back.
 *
 * `isPending` deliberately lives here, *outside* `AlertDialogContent`. Base UI
 * unmounts the popup subtree once it closes, so any state kept inside the popup
 * would be lost at exactly the moment it matters; the spinner label and the
 * pending guard therefore survive the unmount/remount cycle.
 */
export function DeleteShipmentDialog({
  shipmentId,
  shipmentReference,
  open,
  onOpenChange,
  onConfirm,
}: DeleteShipmentDialogProps) {
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(nextOpen: boolean) {
    // A close requested mid-request (Escape, or a click on Cancel if it somehow
    // landed) is dropped: the request has already been sent, so hiding the
    // dialog would hide its outcome. The success path closes through
    // `onOpenChange` directly, once the result is known.
    if (isPending) return;
    onOpenChange(nextOpen);
  }

  function handleConfirm() {
    // The disabled button is the primary double-submit guard; this covers a
    // repeated Enter keypress arriving before React commits the disabled state.
    if (isPending) return;

    startTransition(async () => {
      const result = await onConfirm(shipmentId);

      if (result.success) {
        toast.success("Embarque eliminado correctamente.");
        onOpenChange(false);
        return;
      }

      // The action distinguishes "deleted nothing" (a real failure: the row was
      // removed after the list rendered) from a transport error, so its message
      // is the only accurate thing to show. The dialog stays open so the reason
      // stays on screen and a retry costs one click.
      toast.error(result.error);
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Trash2 aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>
            ¿Eliminar el embarque {shipmentReference}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. El embarque se eliminará de forma
            permanente.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          {/* Cancel is `AlertDialogPrimitive.Close` under the hood: it closes
              and does nothing else — no action call, no toast. */}
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={handleConfirm}
          >
            {isPending ? "Eliminando..." : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}