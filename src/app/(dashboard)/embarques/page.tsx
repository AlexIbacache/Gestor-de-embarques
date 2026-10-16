import { Suspense } from "react";
import { AlertCircle, Package, Search } from "lucide-react";
import { redirect } from "next/navigation";

import { NewShipmentButton } from "@/components/embarques/new-shipment-button";
import { ShipmentFilters } from "@/components/embarques/shipment-filters";
import { ShipmentStatusTabs } from "@/components/embarques/shipment-status-tabs";
import { ShipmentsSkeleton } from "@/components/embarques/shipment-skeleton";
import { ShipmentTable } from "@/components/embarques/shipment-table";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataPagination } from "@/components/ui/data-pagination";
import { createClient } from "@/lib/supabase/server";
import {
  SHIPMENT_MODALITIES,
  SHIPMENT_STATUSES,
} from "@/lib/domain/shipments";
import {
  buildPaginationHref,
  parsePage,
  parsePageSize,
  totalPagesFor,
} from "@/lib/pagination";
import { escapePostgrestValue } from "@/lib/utils";
import type {
  Client,
  ShipmentModality,
  ShipmentStatus,
  ShipmentWithClient,
} from "@/types/database";

// `.env.local` ships with empty Supabase credentials, so `createClient()` throws
// if this page is ever evaluated at build time. The middleware already guards
// the route; this matches the reasoning in the `(dashboard)` layout, the login
// page, the dashboard and the clients page.
export const dynamic = "force-dynamic";

const EMBARQUES_PATH = "/embarques";

/**
 * Ceiling on the client list handed to the forms. `ShipmentForm` renders one
 * `SelectItem` per entry, so an unbounded list would ship every client row in
 * the RSC payload on every page view. `200` is well past the size this test app
 * will reach, and the ordering is by `company` so a truncated list is still the
 * alphabetically-first slice rather than an arbitrary one.
 */
const CLIENT_LIMIT = 200;

/**
 * The only values `?sort=` is allowed to name.
 *
 * A query param is attacker-controlled input, and `.order()` interpolates its
 * argument into the PostgREST `order=` clause, so the raw param is never passed
 * through: `resolveSortColumn` matches it against this list and falls back to
 * `created_at`.
 *
 * `client_id` is here because the spec's acceptance URL sorts by it; it orders
 * by the foreign key rather than the joined company name, so it is only useful
 * as a stable secondary key.
 */
const SORTABLE_COLUMNS = [
  "reference",
  "client_id",
  "origin",
  "destination",
  "modality",
  "status",
  "eta",
  "created_at",
] as const;

type SortableColumn = (typeof SORTABLE_COLUMNS)[number];

/**
 * Next 15+ delivers `searchParams` as a Promise. The values are widened to
 * `string | string[]` because a repeated param (`?search=a&search=b`) really
 * does arrive as an array, and `readParam` normalises it — typing it as `string`
 * would compile and then throw on `.trim()`.
 */
type ShipmentsSearchParams = Promise<{
  search?: string | string[];
  status?: string | string[];
  modality?: string | string[];
  sort?: string | string[];
  order?: string | string[];
  page?: string | string[];
  pageSize?: string | string[];
}>;

type ResolvedSearchParams = Awaited<ShipmentsSearchParams>;

/** First value of a possibly-repeated param, trimmed; `undefined` when empty. */
function readParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

/** `?order=` → `"asc" | "desc"`, default `"asc"`. */
function parseOrder(raw: string | undefined): "asc" | "desc" {
  return raw === "desc" ? "desc" : "asc";
}

/**
 * Normalises `?search=` and returns `undefined` when nothing survives. A term
 * that reduces to `""` is treated as "no search", so `ilike '%%'` is never sent
 * — it would match every row and filter nothing. The PostgREST grammar escaping
 * happens later, in `escapePostgrestValue`, at the point of interpolation.
 */
function parseSearch(raw: string | undefined): string | undefined {
  const trimmed = (raw ?? "").trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Matches a param against a closed set of real values and returns the
 * *allowlist's own* member, never the raw input.
 *
 * That is the point: the returned string goes straight into `.eq()`, so a value
 * that is not in the set must not survive. An unknown `?status=` is therefore
 * the same query as no `?status=` at all — which is also how "All" is encoded,
 * the param being absent rather than empty. `ShipmentFilters` writes the param
 * exactly this way, so the two halves agree on "all".
 *
 * NFC on both sides handles `"En tránsito"`. `URLSearchParams` decodes
 * `?status=En%20tr%C3%A1nsito` into the precomposed `á` (U+00E1) that the
 * `SHIPMENT_STATUSES` array in `src/lib/domain/shipments.ts` also holds, so
 * a byte-for-byte comparison matches. Normalising both sides anyway makes the
 * comparison survive a value pasted from a source that stores the decomposed
 * form (`a` + U+0301), which is not the same string and would otherwise be
 * rejected as an unknown value.
 */
function parseEnum<T extends string>(
  raw: string | undefined,
  allowed: readonly T[],
): T | undefined {
  if (raw === undefined) return undefined;
  const needle = raw.normalize("NFC");
  return allowed.find((value) => value.normalize("NFC") === needle);
}

function parseStatus(raw: string | undefined): ShipmentStatus | undefined {
  return parseEnum(raw, SHIPMENT_STATUSES);
}

function parseModality(raw: string | undefined): ShipmentModality | undefined {
  return parseEnum(raw, SHIPMENT_MODALITIES);
}

function resolveSortColumn(raw: string | undefined): SortableColumn {
  return SORTABLE_COLUMNS.find((column) => column === raw) ?? "created_at";
}

/**
 * The raw params as a `URLSearchParams`, dropping empties and collapsing a
 * repeated param to its first value. The base for the clamp redirect, so it
 * preserves whatever it is not explicitly changing.
 */
function paramsToQuery(params: ResolvedSearchParams): URLSearchParams {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    const single = Array.isArray(value) ? value[0] : value;
    if (single) query.set(key, single);
  }

  return query;
}

export default async function EmbarquesPage({
  searchParams,
}: {
  searchParams: ShipmentsSearchParams;
}) {
  const params = await searchParams;

  const supabase = await createClient();

  /**
   * The client list is awaited *here*, outside the `Suspense` boundary, because
   * both consumers of it live outside it: the header CTA and, through
   * `ShipmentsResults`, the table's edit dialog and the empty state's CTA.
   * `ShipmentForm` refuses to import `createClient` — the data layer must not
   * enter the client bundle — so the page is the only place that can read it.
   *
   * The cost is that this shell cannot stream until the query resolves. It is
   * one `LIMIT 200` round-trip, and it buys a single fetch: doing it inside the
   * boundary instead would mean a second identical query to fill the header.
   */
  const [{ data: clientRows, error: clientsError }, statsResult] =
    await Promise.all([
      supabase
        .from("clients")
        .select("*")
        .order("company", { ascending: true })
        .limit(CLIENT_LIMIT)
        .returns<Client[]>(),

      // Counters for the status tabs. Cosmetic: if the RPC fails the tabs just
      // render without numbers, they never block the list. Untyped for the same
      // reason as in the dashboard (no generated `Database` generic).
      supabase.rpc("get_dashboard_stats"),
    ]);

  const stats = statsResult.error
    ? null
    : (statsResult.data as {
        total: number;
        by_status: Record<string, number>;
      } | null);

  // `.returns<Client[]>()` types the response from the query (design decision
  // D19), so `data` is `Client[] | null` and no `as` assertion is needed.
  // `createClient()` is built without the generated `Database` generic, which is
  // why the row type is named explicitly here.
  const clients = clientRows ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Embarques</h1>
          <p className="text-sm text-muted-foreground">
            Consultá, filtrá y seguí cada carga.
          </p>
        </div>
        {/* No CTA to offer when the list it depends on failed to load: the form
            would open with no selectable client and a disabled submit. */}
        {clientsError ? null : <NewShipmentButton clients={clients} />}
      </div>

      {clientsError ? (
        <ShipmentsErrorState code={clientsError.code} what="los clientes" />
      ) : null}

      <ShipmentStatusTabs
        path={EMBARQUES_PATH}
        params={paramsToQuery(params)}
        active={parseStatus(readParam(params.status))}
        counts={
          stats ? { total: stats.total, byStatus: stats.by_status } : null
        }
      />

      <ShipmentFilters />

      {/* A constant key keeps the boundary identity stable, so a navigation to
          new `searchParams` re-suspends it as a transition instead of throwing
          the mounted subtree away and flashing the skeleton on every debounce
          window. */}
      <Suspense key={EMBARQUES_PATH} fallback={<ShipmentsSkeleton />}>
        <ShipmentsResults params={params} clients={clients} />
      </Suspense>
    </div>
  );
}

async function ShipmentsResults({
  params,
  clients,
}: {
  params: ResolvedSearchParams;
  clients: Client[];
}) {
  const page = parsePage(readParam(params.page));
  const pageSize = parsePageSize(readParam(params.pageSize));
  const order = parseOrder(readParam(params.order));
  const search = parseSearch(readParam(params.search));
  const sort = resolveSortColumn(readParam(params.sort));
  const status = parseStatus(readParam(params.status));
  const modality = parseModality(readParam(params.modality));
  const offset = (page - 1) * pageSize;

  const supabase = await createClient();

  // Ordering, paging, searching and filtering all happen in PostgreSQL: the
  // browser only ever receives the rows on this page plus the total count in the
  // `Content-Range` header.
  //
  // The filtered, ordered query is built by a closure that hands back a *fresh*
  // builder on every call instead of one chain captured in a `let`. The
  // `PGRST103` recovery below needs the exact same filters a second time, and
  // one definition cannot drift from itself the way two hand-written chains
  // would.
  //
  // Inside the closure, `let` rather than `const` because the search and the two
  // facet filters are applied as subsequent statements. Supabase's builder
  // methods are declared with a polymorphic `this` return type, so `q.or(...)`
  // and `q.eq(...)` each keep the exact `PostgrestFilterBuilder` type of `q` and
  // the reassignment type-checks without a cast; a `const` would only fail on
  // the assignment itself.
  const buildQuery = () => {
    let q = supabase
      .from("shipments")
      .select("*, client:clients(id, name, company, email)", { count: "exact" });

    if (search) {
      // One `.or()` covers reference, origin and destination in a single
      // request, which is what the input placeholder promises.
      // `.ilike("reference", ...)` alone would make the placeholder lie. The
      // term is quoted for PostgREST by `escapePostgrestValue`, so a `,` (clause
      // separator), `.`/`:` (operator separator) or `(`/`)`/`"`/`\` in the
      // value can neither break the query nor open another clause; it is matched
      // as literal text.
      const pattern = `%${search}%`;
      const value = escapePostgrestValue(pattern);
      q = q.or(
        `reference.ilike.${value},origin.ilike.${value},destination.ilike.${value}`,
      );
    }

    // Both values are allowlist members returned by `parseEnum`, never the raw
    // param, so `.eq()` is never handed attacker-chosen SQL. Absent means "All",
    // which is no clause at all.
    if (status) q = q.eq("status", status);
    if (modality) q = q.eq("modality", modality);

    return q.order(sort, { ascending: order === "asc" });
  };

  // `.returns<ShipmentWithClient[]>()` binds the embedded `client` join to the
  // hand-written row type (design decision D19), so `data` is
  // `ShipmentWithClient[] | null` and no `as` assertion is needed.
  const { data, error, count } = await buildQuery()
    .range(offset, offset + pageSize - 1)
    .returns<ShipmentWithClient[]>();

  // An out-of-range `page` never reaches the clamp below: the offset is past the
  // last row, so PostgREST answers 416 (`PGRST103`) and the request fails
  // instead of returning a count. Recover by counting with a range that cannot
  // overflow — `range(0, 0)` sits at offset 0, which is always satisfiable, even
  // on an empty table — and redirect to the last page `totalPagesFor` computes.
  // That helper floors at 1, so the redirect cannot loop.
  if (error?.code === "PGRST103") {
    const probe = await buildQuery()
      .range(0, 0)
      .returns<ShipmentWithClient[]>();
    if (probe.error) return <ShipmentsErrorState code={probe.error.code} />;
    redirect(
      buildPaginationHref(EMBARQUES_PATH, paramsToQuery(params), {
        page: totalPagesFor(probe.count ?? 0, pageSize),
      }),
    );
  }

  if (error) return <ShipmentsErrorState code={error.code} />;

  const shipments = data ?? [];
  const totalCount = count ?? 0;
  const totalPages = totalPagesFor(totalCount, pageSize);

  // Post-success clamp, kept as a harmless safety net: an out-of-range `page`
  // must never render an empty table, so redirect to the last valid page,
  // carrying every other param. The zero-result case (`totalPages === 1`)
  // redirects to page 1, which `buildPaginationHref` expresses by dropping the
  // param — and page 1 is always `<= totalPages`, so the redirect cannot loop.
  //
  // This is now unreachable through the failing path: an out-of-range `page`
  // fails earlier with `PGRST103` and is handled by the recovery above. It is
  // retained only in case a backend ever answers an overflowing range with a
  // count instead of a 416.
  if (page > totalPages) {
    redirect(
      buildPaginationHref(EMBARQUES_PATH, paramsToQuery(params), {
        page: totalPages,
      }),
    );
  }

  // `sort` / `order` are not filters: they reorder the same rows, so a sorted
  // list that comes back empty is the empty list, and saying "no encontramos
  // embarques" with a "Limpiar filtros" button would send the user to clear
  // something that was never set.
  const hasActiveFilter =
    search !== undefined || status !== undefined || modality !== undefined;

  return (
    <div className="space-y-4">
      <ShipmentTable
        shipments={shipments}
        clients={clients}
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
      />

      {totalCount === 0 ? (
        <ShipmentsEmptyState hasActiveFilter={hasActiveFilter} clients={clients} />
      ) : (
        <DataPagination
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalCount={totalCount}
        />
      )}
    </div>
  );
}

/**
 * Supabase error *messages* are English, can name constraint and RLS policy
 * details, and are never valid UI copy — `src/app/actions/embarques.ts` maps
 * error codes for exactly this reason. Only the short, non-sensitive code is
 * surfaced here, alongside the Spanish sentence the user actually reads.
 *
 * `what` names the resource so the one component can serve both queries on this
 * page; the copy stays grammatical because the noun phrase carries its article.
 */
function ShipmentsErrorState({
  code,
  what = "los embarques",
}: {
  code?: string;
  what?: string;
}) {
  return (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertTitle>No pudimos cargar {what}</AlertTitle>
      <AlertDescription>
        No se pudo completar la consulta. Revisá tu conexión e intentá de nuevo.
        {code ? (
          <span className="mt-1 block font-mono text-xs opacity-80">
            Código: {code}
          </span>
        ) : null}
      </AlertDescription>
      <AlertAction>
        {/*
          Plain `<a>`, not `router.refresh()`, for the same reason as the
          dashboard and the clients page: a Server Component cannot call
          `useRouter`, and a `"use client"` directive cannot be scoped to one
          component in this file without turning the page — and its Supabase
          queries — into a Client Component. A full reload is honest and works
          without JS.
        */}
        <Button
          variant="outline"
          size="sm"
          render={<a href={EMBARQUES_PATH}>Reintentar</a>}
        />
      </AlertAction>
    </Alert>
  );
}

/**
 * Two different messages, because they call for two different actions. Telling
 * someone who filtered by "En tránsito" that they have no shipments yet would
 * invite them to create the record they were just looking for.
 */
function ShipmentsEmptyState({
  hasActiveFilter,
  clients,
}: {
  hasActiveFilter: boolean;
  clients: Client[];
}) {
  if (hasActiveFilter) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <span
            className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"
            aria-hidden="true"
          >
            <Search className="size-5" />
          </span>
          <div className="space-y-1">
            <p className="font-medium">No se encontraron embarques</p>
            <p className="text-sm text-muted-foreground">
              Probá con otra referencia, origen o destino.
            </p>
          </div>
          {/* Bare path, no query string: "Limpiar filtros" has to drop the
              search, the two Selects and the page offset at once, and deriving
              that from `params` would mean naming every key the page might ever
              add. An empty param set is exactly the unfiltered first page. */}
          <Button
            variant="outline"
            size="sm"
            render={<a href={EMBARQUES_PATH}>Limpiar filtros</a>}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <span
          className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"
          aria-hidden="true"
        >
          <Package className="size-5" />
        </span>
        <div className="space-y-1">
          <p className="font-medium">Todavía no hay embarques</p>
          <p className="text-sm text-muted-foreground">
            Cuando cargues tu primer embarque, aparecerá acá.
          </p>
        </div>
        <NewShipmentButton clients={clients} />
      </CardContent>
    </Card>
  );
}
