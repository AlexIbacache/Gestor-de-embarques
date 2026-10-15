"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { ActionResult } from "@/app/actions/clientes";
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

type DeleteClientDialogProps = {
  clientId: string;
  clientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (id: string) => Promise<ActionResult<{ id: string }>>;
};

export function DeleteClientDialog({
  clientId,
  clientName,
  open,
  onOpenChange,
  onConfirm,
}: DeleteClientDialogProps) {
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(nextOpen: boolean) {
    if (isPending) return;
    onOpenChange(nextOpen);
  }

  function handleConfirm() {
    if (isPending) return;

    startTransition(async () => {
      const result = await onConfirm(clientId);

      if (result.success) {
        toast.success("Cliente eliminado correctamente.");
        onOpenChange(false);
        return;
      }

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
          <AlertDialogTitle>¿Eliminar el cliente {clientName}?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. El cliente se eliminará de forma
            permanente. Los embarques asociados impiden la eliminación.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
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
