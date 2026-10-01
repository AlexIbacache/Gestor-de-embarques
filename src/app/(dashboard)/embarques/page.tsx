import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Package,
  Search,
} from "lucide-react";

import { NewShipmentButton } from "@/components/embarques/new-shipment-button";
import { ShipmentFilters } from "@/components/embarques/shipment-filters";
import { ShipmentTable } from "@/components/embarques/shipment-table";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import {
  SHIPMENT_MODALITIES,
  SHIPMENT_STATUSES,
} from "@/lib/validations/shipment";
import { formatSearchTerm } from "@/lib/utils";
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
const PAGE_SIZE = 10;

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
}>;

type ResolvedSearchParams = Awaited<ShipmentsSearchParams>;

/** First value of a possibly-repeated param, trimmed; `undefined` when empty. */
function readParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

/** `?page=` → positive integer, default 1. */
function parsePage(raw: string | undefined): number {
  // `Number`, not `parseInt`: `parseInt("2abc")` is `2`, which would silently
  // accept a malformed param.
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

/** `?order=` → `"asc" | "desc"`, default `"asc"`. */
function parseOrder(raw: string | undefined): "asc" | "desc" {
  return raw === "desc" ? "desc" : "asc";
}

/**
 * Sanitises `?search=` for PostgREST and returns `undefined` when nothing
 * survives. `formatSearchTerm` already strips the characters that could escape
 * the filter value; a term that reduces to `""` is treated as "no search", so
 * `ilike '%%'` is never sent — it would match every row and filter nothing.
 */
function parseSearch(raw: string | undefined): string | undefined {
  const sanitized = formatSearchTerm(raw ?? "");
  return sanitized ? sanitized : undefined;
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
 * `SHIPMENT_STATUSES` literal in `src/lib/validations/shipment.ts` also holds, so
 * a byte-for-byte comparison matches. Normalising both sides anyway makes the
 * comparison survive a value pasted from a source that stores the decomposed
 * form (`a` + U+0301), which is not the same string and would otherwise be
 * rejected as unknown.
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
 * Rebuilds the query string from `params`, changing only the keys in `drop`.
 * Hand-writing `?page=2` would silently discard the active search, filters and
 * sort on every pagination click.
 */
function buildHref(
  params: ResolvedSearchParams,
  { drop, set }: { drop: readonly string[]; set?: string },
): string {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (drop.includes(key) || value === undefined) continue;
    const single = Array.isArray(value) ? value[0] : value;
    if (single) query.set(key, single);
  }

  if (set) query.set("page", set);

  const serialised = query.toString();
  return serialised ? `${EMBARQUES_PATH}?${serialised}` : EMBARQUES_PATH;
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
  const { data: clientRows, error: clientsError } = await supabase
    .from("clients")
    .select("*")
    .order("company", { ascending: true })
    .limit(CLIENT_LIMIT);

  // `createClient()` is built without the generated `Database` generic, so
  // PostgREST types `data` as `any`. Re-typed once, here, at the boundary.
  const clients = (clientRows ?? []) as Client[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Embarques</h1>
        {/* No CTA to offer when the list it depends on failed to load: the form
            would open with no selectable client and a disabled submit. */}
        {clientsError ? null : <NewShipmentButton clients={clients} />}
      </div>

      {clientsError ? (
        <ShipmentsErrorState code={clientsError.code} what="los clientes" />
      ) : null}

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
  const order = parseOrder(readParam(params.order));
  const search = parseSearch(readParam(params.search));
  const sort = resolveSortColumn(readParam(params.sort));
  const status = parseStatus(readParam(params.status));
  const modality = parseModality(readParam(params.modality));
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();

  // Ordering, paging, searching and filtering all happen in PostgreSQL: the
  // browser only ever receives the ten rows on this page plus the total count in
  // the `Content-Range` header.
  //
  // `let` rather than `const` because the search and the two facet filters are
  // applied as subsequent statements. Supabase's builder methods are declared
  // with a polymorphic `this` return type, so `query.or(...)` and `query.eq(...)`
  // each keep the exact `PostgrestFilterBuilder` type of `query` and the
  // reassignment type-checks without a cast; a `const` would only fail on the
  // assignment itself. `await` on the builder is a `PromiseLike`, so it is
  // destructured once, after every filter has been chained onto it.
  let query = supabase
    .from("shipments")
    .select("*, client:clients(id, name, company, email)", { count: "exact" })
    .order(sort, { ascending: order === "asc" })
    .range(offset, offset + PAGE_SIZE - 1);

  if (search) {
    // One `.or()` covers reference, origin and destination in a single request,
    // which is what the input placeholder promises. `.ilike("reference", ...)`
    // alone would make the placeholder lie. `search` is already
    // `formatSearchTerm`-sanitised, so `,` and the `%*,()` characters that would
    // let a value break out of the filter clause are gone.
    const pattern = `%${search}%`;
    query = query.or(
      `reference.ilike.${pattern},origin.ilike.${pattern},destination.ilike.${pattern}`,
    );
  }

  // Both values are allowlist members returned by `parseEnum`, never the raw
  // param, so `.eq()` is never handed attacker-chosen SQL. Absent means "All",
  // which is no clause at all.
  if (status) query = query.eq("status", status);
  if (modality) query = query.eq("modality", modality);

  const { data, error, count } = await query;

  if (error) return <ShipmentsErrorState code={error.code} />;

  const shipments = (data ?? []) as ShipmentWithClient[];
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

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
        <ShipmentsPagination
          page={page}
          totalPages={totalPages}
          previousHref={buildHref(params, { drop: [], set: String(page - 1) })}
          nextHref={buildHref(params, { drop: [], set: String(page + 1) })}
          hasPrevious={page > 1}
          hasNext={page < totalPages}
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

function ShipmentsPagination({
  page,
  totalPages,
  previousHref,
  nextHref,
  hasPrevious,
  hasNext,
}: {
  page: number;
  totalPages: number;
  previousHref: string;
  nextHref: string;
  hasPrevious: boolean;
  hasNext: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-sm text-muted-foreground">
        Página {page} de {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <PageControl disabled={!hasPrevious} href={previousHref}>
          <ChevronLeft data-icon="inline-start" />
          Anterior
        </PageControl>
        <PageControl disabled={!hasNext} href={nextHref}>
          Siguiente
          <ChevronRight data-icon="inline-end" />
        </PageControl>
      </div>
    </div>
  );
}

/**
 * `disabled` on `render={<Link />}` would be a lie: an `<a>` has no `:disabled`
 * state, so it would still be clickable, still be keyboard-reachable, and
 * Tailwind's `disabled:` variant would never dim it. The disabled branch
 * therefore renders a real native `<button disabled>` instead.
 */
function PageControl({
  disabled,
  href,
  children,
}: {
  disabled: boolean;
  href: string;
  children: ReactNode;
}) {
  if (disabled) {
    return (
      <Button variant="outline" size="sm" disabled>
        {children}
      </Button>
    );
  }

  return (
    <Button variant="outline" size="sm" render={<Link href={href} />}>
      {children}
    </Button>
  );
}

/**
 * Placeholder for the `Suspense` boundary. Rectangles only — the literal text
 * "Cargando..." is forbidden by the project UI convention.
 *
 * The filter row is deliberately *not* mirrored here. `ShipmentFilters` is
 * rendered outside this boundary and is already interactive, so a second
 * placeholder underneath it would render two filter bars while the query is in
 * flight and then collapse one of them, shifting everything below it by the
 * height of a row. `ClientsSkeleton` on `/clientes` makes the same choice for
 * the same reason.
 */
function ShipmentsSkeleton() {
  return (
    <div className="space-y-4">
      {/* `lg` is the same breakpoint the live table switches at: skeleton and
          table must be the same layout or the swap shifts the page. */}
      <div className="hidden lg:block">
        <Card className="py-0">
          <CardContent className="space-y-4 px-4 py-4">
            {[0, 1, 2, 3, 4].map((index) => (
              <div key={index} className="flex items-center gap-4">
                <Skeleton className="h-4 w-36 shrink-0" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="hidden h-4 flex-1 lg:block" />
                <Skeleton className="hidden h-4 w-24 lg:block" />
                <Skeleton className="h-4 w-20 shrink-0" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3 lg:hidden">
        {[0, 1, 2, 3, 4].map((index) => (
          <Card key={index}>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}