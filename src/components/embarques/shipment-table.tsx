"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";

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
   * the pagination controls are a Client Component that reads the URL itself.
   */
  page: number;
  totalPages: number;
  totalCount: number;
};

/** Kept in sync with the `SORTABLE_COLUMNS` allowlist in `embarques/page.tsx`. */
const EMBARQUES_PATH = "/embarques";

/**
 * Mirrors the `SORTABLE_COLUMNS` allowlist in
 * `src/app/(dashboard)/embarques/page.tsx`.
 *
 * Duplicated rather than imported because the allowlist lives in a Server
 * Component module: importing it from here would pull `createClient()` (and the
 * `cookies()` import chain) into the browser bundle. The server copy stays the
 * authority — it is what actually rejects an unknown `?sort=` value — this one
 * only decides which headers render as links.
 *
 * `client_id` is the one entry whose label and column differ: the server can
 * only order by the foreign key, never the joined company name, so "Cliente"
 * sorts by that key rather than alphabetically by name.
 */
const SORTABLE_COLUMNS = [
  { key: "reference", label: "Referencia" },
  { key: "client_id", label: "Cliente" },
  { key: "origin", label: "Origen" },
  { key: "destination", label: "Destino" },
  { key: "modality", label: "Modalidad" },
  { key: "status", label: "Estado" },
  { key: "eta", label: "ETA" },
  { key: "created_at", label: "Creado" },
] as const;

type SortableColumn = (typeof SORTABLE_COLUMNS)[number]["key"];

/**
 * Builds the href for a sort toggle, mirroring `client-table.tsx`.
 *
 * Every current param is copied first, so the active search and filters survive
 * the sort change, and `page` is dropped because a new ordering invalidates the
 * current offset — otherwise the user lands on page 4 of a result set that only
 * has one page and sees an empty table.
 */
function buildSortHref(current: URLSearchParams, column: SortableColumn): string {
  const next = new URLSearchParams(current.toString());
  const isActiveColumn = current.get("sort") === column;
  // Same column toggles the direction, a different column starts ascending.
  const nextOrder = isActiveColumn && current.get("order") === "asc" ? "desc" : "asc";

  next.set("sort", column);
  next.set("order", nextOrder);
  next.delete("page");

  return `${EMBARQUES_PATH}?${next.toString()}`;
}

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
 * The desktop headers are sort links, in parity with `client-table.tsx`: they
 * write `?sort=<field>&order=<asc|desc>` and the active field shows a direction
 * arrow. Sorting is read from the URL, never from local state, because the
 * Server Component re-runs the query on navigation.
 */
export function ShipmentTable({
  shipments,
  clients,
  totalCount,
}: ShipmentTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSort = searchParams.get("sort");
  const activeOrder = searchParams.get("order");

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

  function handleDeleteRequest(shipment: ShipmentWithClient) {
    setDeletingShipment(shipment);
    setIsDeleteDialogOpen(true);
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
                    {SORTABLE_COLUMNS.map((column) => {
                      const isActive = activeSort === column.key;
                      const ariaSort = isActive
                        ? activeOrder === "desc"
                          ? "descending"
                          : "ascending"
                        : "none";

                      return (
                        <TableHead key={column.key} aria-sort={ariaSort}>
                          <Link
                            href={buildSortHref(searchParams, column.key)}
                            className="inline-flex items-center gap-1 rounded-sm outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
                          >
                            {column.label}
                            {isActive ? (
                              activeOrder === "desc" ? (
                                <ArrowDown className="size-3.5" aria-hidden="true" />
                              ) : (
                                <ArrowUp className="size-3.5" aria-hidden="true" />
                              )
                            ) : null}
                          </Link>
                        </TableHead>
                      );
                    })}
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
                          onDelete={handleDeleteRequest}
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
                    onDelete={handleDeleteRequest}
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