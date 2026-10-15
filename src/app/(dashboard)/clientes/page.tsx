import { Suspense } from "react";
import { AlertCircle, Search, Users } from "lucide-react";
import { redirect } from "next/navigation";

import { ClientFilters } from "@/components/clientes/client-filters";
import { ClientsSkeleton } from "@/components/clientes/client-skeleton";
import { ClientTable } from "@/components/clientes/client-table";
import { NewClientButton } from "@/components/clientes/new-client-button";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataPagination } from "@/components/ui/data-pagination";
import {
  buildPaginationHref,
  parsePage,
  parsePageSize,
  totalPagesFor,
} from "@/lib/pagination";
import { createClient } from "@/lib/supabase/server";
import {
  escapePostgrestValue,
  parseCalendarDateParam,
  startOfNextUtcDay,
  startOfUtcDay,
} from "@/lib/utils";
import type { Client } from "@/types/database";

// `.env.local` ships with empty Supabase credentials, so `createClient()` throws
// if this page is ever evaluated at build time. The middleware already guards
// the route; this matches the reasoning in the `(dashboard)` layout and the
// login page.
export const dynamic = "force-dynamic";

const CLIENTS_PATH = "/clientes";

/**
 * The only values `?sort=` is allowed to name.
 *
 * A query param is attacker-controlled input, and `.order()` interpolates its
 * argument into the PostgREST `order=` clause, so the raw param is never passed
 * through: `resolveSortColumn` matches it against this list and falls back to
 * `name`.
 */
const SORTABLE_COLUMNS = ["name", "email", "company", "created_at"] as const;

type SortableColumn = (typeof SORTABLE_COLUMNS)[number];

/**
 * Next 15+ delivers `searchParams` as a Promise. The values are widened to
 * `string | string[]` because a repeated param (`?search=a&search=b`) really
 * does arrive as an array, and `readParam` normalises it — typing it as `string`
 * would compile and then throw on `.trim()`.
 */
type ClientsSearchParams = Promise<{
  search?: string | string[];
  sort?: string | string[];
  order?: string | string[];
  page?: string | string[];
  pageSize?: string | string[];
  from?: string | string[];
  to?: string | string[];
}>;

type ResolvedSearchParams = Awaited<ClientsSearchParams>;

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

function resolveSortColumn(raw: string | undefined): SortableColumn {
  return SORTABLE_COLUMNS.find((column) => column === raw) ?? "name";
}

/** First value of a possibly-repeated param, trimmed; `undefined` when empty. */
function readParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * The raw params as a `URLSearchParams`, dropping empties and collapsing a
 * repeated param to its first value. This is the base every URL this page builds
 * starts from, so a redirect or a "clear filters" link preserves whatever it is
 * not explicitly changing.
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

/** Path plus query string, without a trailing `?` when the query is empty. */
function hrefWithQuery(path: string, query: URLSearchParams): string {
  const serialised = query.toString();
  return serialised ? `${path}?${serialised}` : path;
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: ClientsSearchParams;
}) {
  const params = await searchParams;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
        <NewClientButton />
      </div>

      <ClientFilters />

      {/* A constant key keeps the boundary identity stable, so a navigation to
          new `searchParams` re-suspends it as a transition instead of throwing
          the mounted subtree away and flashing the skeleton on every debounce
          window. */}
      <Suspense key={CLIENTS_PATH} fallback={<ClientsSkeleton />}>
        <ClientsResults params={params} />
      </Suspense>
    </div>
  );
}

async function ClientsResults({ params }: { params: ResolvedSearchParams }) {
  const page = parsePage(readParam(params.page));
  const pageSize = parsePageSize(readParam(params.pageSize));
  const order = parseOrder(readParam(params.order));
  const search = parseSearch(readParam(params.search));
  const sort = resolveSortColumn(readParam(params.sort));
  const from = parseCalendarDateParam(readParam(params.from));
  const to = parseCalendarDateParam(readParam(params.to));
  const offset = (page - 1) * pageSize;

  const supabase = await createClient();

  // Ordering, paging, searching and date filtering all happen in PostgreSQL:
  // the browser only ever receives the rows on this page plus the total count in
  // the `Content-Range` header.
  //
  // `let` rather than `const` because the filters are applied as second
  // statements. Supabase's builder methods are declared with a polymorphic
  // `this` return type, so `query.or(...)` / `query.gte(...)` keep the exact
  // `PostgrestFilterBuilder` type of `query` and the reassignment type-checks
  // without a cast; a `const` would only fail on the assignment itself.
  let query = supabase
    .from("clients")
    .select("*", { count: "exact" })
    .order(sort, { ascending: order === "asc" })
    .range(offset, offset + pageSize - 1);

  if (search) {
    // One `.or()` covers name, email and company in a single request, which is
    // what the input placeholder promises. `.ilike("name", ...)` alone would
    // make the placeholder lie. The term is quoted for PostgREST by
    // `escapePostgrestValue`, so a `,` (clause separator), `.`/`:` (operator
    // separator) or `(`/`)`/`"`/`\` in the value can neither break the query nor
    // open another clause; it is matched as literal text.
    const pattern = `%${search}%`;
    const value = escapePostgrestValue(pattern);
    query = query.or(
      `name.ilike.${value},email.ilike.${value},company.ilike.${value}`,
    );
  }

  // Half-open day range on the `created_at` instant, boundaries in UTC (design
  // decision D20 — see `startOfUtcDay` / `startOfNextUtcDay`). `>= from 00:00Z`
  // and `< day-after-to 00:00Z` includes the whole `to` day without an
  // inclusive-end rounding error.
  if (from) query = query.gte("created_at", startOfUtcDay(from));
  if (to) query = query.lt("created_at", startOfNextUtcDay(to));

  const { data, error, count } = await query;

  if (error) return <ClientsErrorState code={error.code} />;

  // `createClient()` is built without the generated `Database` generic, so
  // PostgREST types `data` as `any`. Re-typed once, here, at the boundary.
  const clients = (data ?? []) as Client[];
  const totalCount = count ?? 0;
  const totalPages = totalPagesFor(totalCount, pageSize);

  // Clamp: an out-of-range `page` must never render an empty table. Redirect to
  // the last valid page, carrying every other param. The zero-result case
  // (`totalPages === 1`) redirects to page 1, which `buildPaginationHref`
  // expresses by dropping the param — and page 1 is always `<= totalPages`, so
  // the redirect cannot loop.
  if (page > totalPages) {
    redirect(
      buildPaginationHref(CLIENTS_PATH, paramsToQuery(params), {
        page: totalPages,
      }),
    );
  }

  const hasActiveFilter =
    search !== undefined || from !== undefined || to !== undefined;

  // "Clear filters" drops exactly the keys the filter bar owns; the sort, the
  // page size and anything added later survive.
  const clearQuery = paramsToQuery(params);
  clearQuery.delete("search");
  clearQuery.delete("from");
  clearQuery.delete("to");
  clearQuery.delete("page");
  const clearFiltersHref = hrefWithQuery(CLIENTS_PATH, clearQuery);

  return (
    <div className="space-y-4">
      <ClientTable
        clients={clients}
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
      />

      {totalCount === 0 ? (
        <ClientsEmptyState
          hasActiveFilter={hasActiveFilter}
          clearFiltersHref={clearFiltersHref}
        />
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
 * details, and are never valid UI copy — `src/app/actions/clientes.ts` maps
 * error codes for exactly this reason. Only the short, non-sensitive code is
 * surfaced here, alongside the Spanish sentence the user actually reads.
 */
function ClientsErrorState({ code }: { code?: string }) {
  return (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertTitle>No pudimos cargar los clientes</AlertTitle>
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
          dashboard: a Server Component cannot call `useRouter`, and a
          `"use client"` directive cannot be scoped to one component in this
          file without turning the page — and its Supabase queries — into a
          Client Component. A full reload is honest and works without JS.
        */}
        <Button
          variant="outline"
          size="sm"
          render={<a href={CLIENTS_PATH}>Reintentar</a>}
        />
      </AlertAction>
    </Alert>
  );
}

/**
 * Two different messages, because they call for two different actions. Telling
 * someone who filtered by date or searched for "acme" that they have no clients
 * yet would invite them to create the record they were just looking for.
 */
function ClientsEmptyState({
  hasActiveFilter,
  clearFiltersHref,
}: {
  hasActiveFilter: boolean;
  clearFiltersHref: string;
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
            <p className="font-medium">No se encontraron clientes</p>
            <p className="text-sm text-muted-foreground">
              Probá con otro nombre, email o empresa, o ajustá el rango de fechas.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            render={<a href={clearFiltersHref}>Limpiar filtros</a>}
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
          <Users className="size-5" />
        </span>
        <div className="space-y-1">
          <p className="font-medium">Todavía no hay clientes</p>
          <p className="text-sm text-muted-foreground">
            Cuando cargues tu primer cliente, aparecerá acá.
          </p>
        </div>
        <NewClientButton />
      </CardContent>
    </Card>
  );
}
