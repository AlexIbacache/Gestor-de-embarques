"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";

import { deleteShipmentAction } from "@/app/actions/embarques";
import { DeleteShipmentDialog } from "@/components/embarques/delete-shipment-dialog";
import { ShipmentForm } from "@/components/embarques/shipment-form";
import { ShipmentStatusBadge } from "@/components/embarques/shipment-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CARD_STAGGER_MS,
  FadeIn,
  FadeInTableRow,
  ROW_STAGGER_CAP,
} from "@/components/ui/motion";
import {
  TABLE_ROW_CLASS,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { Client, Shipment, ShipmentWithClient } from "@/types/database";

type ShipmentTableProps = {
  shipments: ShipmentWithClient[];
  /** Required by the edit dialog's client `Select`; supplied by the server page. */
  clients: Client[];
  /**
   * Accepted for symmetry with the server page but deliberately not read here:
   * the pagination controls are `next/link` hrefs only the Server Component can
   * build, because they must be derived from the raw `searchParams` object.
   */
  page: number;
  totalPages: number;
  totalCount: number;
};

/** WU-9 detail route. It does not exist yet; the link is wired in advance. */
function shipmentHref(id: string): string {
  return `/embarques/${id}`;
}

/**
 * `client` is `Client | null` on `ShipmentWithClient` because RLS can hide the
 * related row. The join is inner-ish in practice, but a null must render as
 * "Sin cliente" rather than crashing the list or printing "null".
 */
function clientLabel(shipment: ShipmentWithClient): string {
  if (!shipment.client) return "Sin cliente";
  return shipment.client.name
    ? `${shipment.client.company} — ${shipment.client.name}`
    : shipment.client.company;
}

/**
 * Data table for the shipments list, with two presentations of the same rows: a
 * real `<table>` from `lg` up, and one `Card` per shipment below it. Both read
 * from the same `shipments` prop, so the two views cannot disagree.
 *
 * Headers are inert. `client-table.tsx` links them to `?sort=&order=` because the
 * clients page resolves that allowlist server-side; the shipments page does not
 * read those params yet, so a link here would 404-free but silently unsorted.
 */
export function ShipmentTable({
  shipments,
  clients,
  totalCount,
}: ShipmentTableProps) {
  const router = useRouter();

  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deletingShipment, setDeletingShipment] = useState<ShipmentWithClient | null>(
    null,
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  function handleEdit(shipment: ShipmentWithClient) {
    setEditingShipment(shipment);
    setIsFormOpen(true);
  }

  function handleFormOpenChange(nextOpen: boolean) {
    setIsFormOpen(nextOpen);
    // `editingShipment` is intentionally not cleared on close: `ShipmentForm`
    // keys its popup on `shipment?.id`, so nulling it mid-close would remount the
    // popup and cut the exit animation short. The next open always sets it first.
  }

  async function handleConfirmDelete(id: string) {
    const result = await deleteShipmentAction({ id });

    // `deleteShipmentAction` already calls `revalidatePath("/embarques")`, but
    // that invalidates the server cache for a *future* navigation. The current
    // page is still mounted with the deleted row in its props, so without
    // `refresh()` the row stays on screen until a manual reload.
    if (result.success) router.refresh();

    // The result is returned as-is: `DeleteShipmentDialog` owns the toast copy,
    // and a "zero rows deleted" answer is a failure that must not be reported
    // as a success. Only `data.id` is ever read, and only on success.
    return result;
  }

  // The page owns the empty state — it also owns the count, and duplicating the
  // "no shipments" card here would render two of them.
  if (shipments.length === 0) return null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Embarques ({totalCount})</p>

      {/* Desktop: a real table. Nine columns need the width `xl` gives them —
          below it the sidebar leaves too little room and the table would
          scroll horizontally inside its own card. */}
      <div className="hidden xl:block">
        <Card className="py-0">
          <CardContent className="px-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[980px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Referencia</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead>Modalidad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>ETA</TableHead>
                    <TableHead>Creado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {shipments.map((shipment, index) => (
                    <FadeInTableRow
                      key={shipment.id}
                      index={index}
                      className={TABLE_ROW_CLASS}
                    >
                      <TableCell className="max-w-[180px] truncate font-medium">
                        <Link
                          href={shipmentHref(shipment.id)}
                          className="rounded-sm outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
                          title={shipment.reference}
                        >
                          {shipment.reference}
                        </Link>
                      </TableCell>
                      <TableCell
                        className="max-w-[240px] truncate"
                        title={clientLabel(shipment)}
                      >
                        {clientLabel(shipment)}
                      </TableCell>
                      <TableCell
                        className="max-w-[200px] truncate"
                        title={shipment.origin}
                      >
                        {shipment.origin}
                      </TableCell>
                      <TableCell
                        className="max-w-[200px] truncate"
                        title={shipment.destination}
                      >
                        {shipment.destination}
                      </TableCell>
                      <TableCell>{shipment.modality}</TableCell>
                      <TableCell>
                        <ShipmentStatusBadge status={shipment.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <time dateTime={shipment.eta}>{formatDate(shipment.eta)}</time>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <time dateTime={shipment.created_at}>
                          {formatDateTime(shipment.created_at)}
                        </time>
                      </TableCell>
                      <TableCell>
                        <RowActions
                          shipment={shipment}
                          onEdit={handleEdit}
                          onDelete={setDeletingShipment}
                        />
                      </TableCell>
                    </FadeInTableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Below `xl`: same fields, stacked, no table semantics — a nine-column
          table would either overflow or need the horizontal scroll the layout
          forbids. */}
      <div className="space-y-3 xl:hidden">
        {shipments.map((shipment, index) => (
          <FadeIn
            key={shipment.id}
            delay={Math.min(index, ROW_STAGGER_CAP) * CARD_STAGGER_MS}
          >
            <Card>
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <Link
                    href={shipmentHref(shipment.id)}
                    className="block truncate rounded-sm font-medium outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    title={shipment.reference}
                  >
                    {shipment.reference}
                  </Link>
                  <p
                    className="truncate text-sm text-muted-foreground"
                    title={clientLabel(shipment)}
                  >
                    {clientLabel(shipment)}
                  </p>
                </div>
                <ShipmentStatusBadge status={shipment.status} />
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <Field label="Origen" value={shipment.origin} />
                <Field label="Destino" value={shipment.destination} />
                <Field label="Modalidad" value={shipment.modality} />
                <Field label="ETA" value={formatDate(shipment.eta)} />
              </div>

              <div className="flex items-center justify-between gap-3">
                <time
                  dateTime={shipment.created_at}
                  className="shrink-0 text-sm whitespace-nowrap text-muted-foreground"
                >
                  {formatDateTime(shipment.created_at)}
                </time>
                <div className="flex justify-end gap-1">
                  <RowActions
                    shipment={shipment}
                    onEdit={handleEdit}
                    onDelete={setDeletingShipment}
                  />
                </div>
              </div>
            </CardContent>
            </Card>
          </FadeIn>
        ))}
      </div>

      {/* One form and one confirm dialog for the whole table, not one per row:
          every row would otherwise mount its own popup and its own form state.
          `ShipmentForm` is handed `shipment` as `Shipment` — the join extra is
          structural, so the editable fields are identical. */}
      <ShipmentForm
        shipment={editingShipment ?? undefined}
        clients={clients}
        open={isFormOpen}
        onOpenChange={handleFormOpenChange}
      />

      <DeleteShipmentDialog
        shipmentId={deletingShipment?.id ?? ""}
        shipmentReference={deletingShipment?.reference ?? ""}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate" title={value}>
        {value}
      </p>
    </div>
  );
}

function RowActions({
  shipment,
  onEdit,
  onDelete,
}: {
  shipment: ShipmentWithClient;
  onEdit: (shipment: ShipmentWithClient) => void;
  onDelete: (shipment: ShipmentWithClient) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      {/* The reference is in every `aria-label`: a grid of identical icon buttons
          is unusable with a screen reader otherwise. */}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Editar ${shipment.reference}`}
        onClick={() => onEdit(shipment)}
      >
        <Pencil />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Eliminar ${shipment.reference}`}
        onClick={() => onDelete(shipment)}
      >
        <Trash2 />
      </Button>
    </div>
  );
}