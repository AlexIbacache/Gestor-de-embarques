"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";

import { ClientForm } from "@/components/clientes/client-form";
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
import { formatDateTime } from "@/lib/utils";
import type { Client } from "@/types/database";

/** Kept in sync with the `SORTABLE_COLUMNS` allowlist in `clientes/page.tsx`. */
const CLIENTS_PATH = "/clientes";

/**
 * Mirrors the `SORTABLE_COLUMNS` allowlist in `src/app/(dashboard)/clientes/page.tsx`.
 *
 * Duplicated rather than imported because the allowlist lives in a Server
 * Component module: importing it from here would pull `createClient()` (and the
 * `cookies()` import chain) into the browser bundle. The server copy stays the
 * authority — it is what actually rejects an unknown `?sort=` value — this one
 * only decides which headers render as links.
 */
const SORTABLE_COLUMNS = [
  { key: "name", label: "Nombre" },
  { key: "email", label: "Email" },
  { key: "company", label: "Empresa" },
  { key: "created_at", label: "Creado" },
] as const;

type SortableColumn = (typeof SORTABLE_COLUMNS)[number]["key"];

type ClientTableProps = {
  clients: Client[];
  /**
   * Accepted for symmetry with the server page but deliberately not read here:
   * the pagination controls are `next/link` hrefs that only the Server Component
   * can build, because they must be derived from the raw `searchParams` object.
   */
  page: number;
  totalPages: number;
  totalCount: number;
};

/**
 * Builds the href for a sort toggle.
 *
 * Every current param is copied first, so the active search survives the sort
 * change, and `page` is dropped because a new ordering invalidates the current
 * offset — otherwise the user lands on page 4 of a result set that only has 1
 * page and sees an empty table.
 */
function buildSortHref(current: URLSearchParams, column: SortableColumn): string {
  const next = new URLSearchParams(current.toString());
  const isActiveColumn = current.get("sort") === column;
  // Same column toggles the direction, a different column starts ascending.
  const nextOrder = isActiveColumn && current.get("order") === "asc" ? "desc" : "asc";

  next.set("sort", column);
  next.set("order", nextOrder);
  next.delete("page");

  return `${CLIENTS_PATH}?${next.toString()}`;
}

/**
 * Data table for the clients list, with two presentations of the same rows: a
 * real `<table>` from `md` up, and one `Card` per client below it. The rows come
 * from a single prop so the two views can never disagree.
 */
export function ClientTable({ clients, totalCount }: ClientTableProps) {
  // Sorting is read from the URL, never from local state: the Server Component
  // re-runs the query on navigation, and a local sort would need the whole list
  // in the browser to work at all.
  const searchParams = useSearchParams();
  const activeSort = searchParams.get("sort");
  const activeOrder = searchParams.get("order");

  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  function handleEdit(client: Client) {
    setEditingClient(client);
    setIsFormOpen(true);
  }

  function handleFormOpenChange(nextOpen: boolean) {
    setIsFormOpen(nextOpen);
    // `editingClient` is intentionally *not* cleared on close: `ClientForm`
    // keys its popup on `client?.id`, so nulling it mid-close would remount the
    // popup and cut the exit animation short. The next open always sets it
    // first, so a stale row can never leak into a different dialog.
  }

  // The page owns the empty state — it also owns the count, and duplicating the
  // "no clients" card here would render two of them.
  if (clients.length === 0) return null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Clientes ({totalCount})</p>

      {/* Desktop: a real table. */}
      <div className="hidden md:block">
        <Card className="py-0">
          <CardContent className="px-0">
            <Table>
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
                {clients.map((client, index) => (
                  <FadeInTableRow
                    key={client.id}
                    index={index}
                    className={TABLE_ROW_CLASS}
                  >
                    <TableCell
                      className="max-w-[220px] truncate font-medium"
                      title={client.name}
                    >
                      {client.name}
                    </TableCell>
                    <TableCell className="max-w-[260px] truncate" title={client.email}>
                      {client.email}
                    </TableCell>
                    <TableCell
                      className="max-w-[220px] truncate text-muted-foreground"
                      title={client.company}
                    >
                      {client.company}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      <time dateTime={client.created_at}>
                        {formatDateTime(client.created_at)}
                      </time>
                    </TableCell>
                    <TableCell>
                      <RowActions
                        client={client}
                        onEdit={handleEdit}
                      />
                    </TableCell>
                  </FadeInTableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Mobile: same fields, stacked, no table semantics — a 5-column table
          would either overflow or need the horizontal scroll the layout
          forbids. */}
      <div className="space-y-3 md:hidden">
        {clients.map((client, index) => (
          <FadeIn
            key={client.id}
            delay={Math.min(index, ROW_STAGGER_CAP) * CARD_STAGGER_MS}
          >
            <Card>
              <CardContent className="space-y-3">
              <div className="space-y-1">
                <p className="truncate font-medium" title={client.name}>
                  {client.name}
                </p>
                <p className="truncate text-sm text-muted-foreground" title={client.email}>
                  {client.email}
                </p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p
                  className="min-w-0 truncate text-sm text-muted-foreground"
                  title={client.company}
                >
                  {client.company}
                </p>
                <time
                  dateTime={client.created_at}
                  className="shrink-0 text-sm whitespace-nowrap text-muted-foreground"
                >
                  {formatDateTime(client.created_at)}
                </time>
              </div>
              <div className="flex justify-end gap-1">
                <RowActions client={client} onEdit={handleEdit} />
              </div>
            </CardContent>
            </Card>
          </FadeIn>
        ))}
      </div>

      {/* One controlled form for the whole table, not one per row: every row
          would otherwise mount its own dialog popup and its own form state. */}
      <ClientForm
        client={editingClient ?? undefined}
        open={isFormOpen}
        onOpenChange={handleFormOpenChange}
      />
    </div>
  );
}

function RowActions({
  client,
  onEdit,
}: {
  client: Client;
  onEdit: (client: Client) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Editar ${client.name}`}
        onClick={() => onEdit(client)}
      >
        <Pencil />
      </Button>
      {/*
        Delete placeholder. There is no `deleteClientAction` yet, so this is a
        genuinely disabled control rather than a button that silently does
        nothing: shipping a live-looking destructive action that no-ops is worse
        than shipping none. The icon and slot are in place so the column does
        not shift when the action lands.
      */}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Eliminar ${client.name}`}
        disabled
      >
        <Trash2 />
      </Button>
    </div>
  );
}
