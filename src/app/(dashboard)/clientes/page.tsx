import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { AlertCircle, ChevronLeft, ChevronRight, Search, Users } from "lucide-react";

import { ClientFilters } from "@/components/clientes/client-filters";
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
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import { formatSearchTerm } from "@/lib/utils";
import type { Client } from "@/types/database";

// `.env.local` ships with empty Supabase credentials, so `createClient()` throws
// if this page is ever evaluated at build time. The middleware already guards
// the route; this matches the reasoning in the `(dashboard)` layout and the
// login page.
export const dynamic = "force-dynamic";

const CLIENTS_PATH = "/clientes";
const PAGE_SIZE = 10;

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
}>;

type ResolvedSearchParams = Awaited<ClientsSearchParams>;

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
 * Rebuilds the query string from `params`, changing only the keys in `drop`.
 * Hand-writing `?page=2` would silently discard the active search and sort on
 * every pagination click.
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
  return serialised ? `${CLIENTS_PATH}?${serialised}` : CLIENTS_PATH;
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
  const order = parseOrder(readParam(params.order));
  const search = parseSearch(readParam(params.search));
  const sort = resolveSortColumn(readParam(params.sort));
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();

  // Ordering, paging and searching all happen in PostgreSQL: the browser only
  // ever receives the ten rows on this page plus the total count in the
  // `Content-Range` header.
  //
  // `let` rather than `const` because the search filter is applied as a second
  // statement. Supabase's builder methods are declared with a polymorphic
  // `this` return type, so `query.or(...)` keeps the exact
  // `PostgrestFilterBuilder` type of `query` and the reassignment type-checks
  // without a cast; a `const` would only fail on the assignment itself.
  let query = supabase
    .from("clients")
    .select("*", { count: "exact" })
    .order(sort, { ascending: order === "asc" })
    .range(offset, offset + PAGE_SIZE - 1);

  if (search) {
    // One `.or()` covers name, email and company in a single request, which is
    // what the input placeholder promises. `.ilike("name", ...)` alone would
    // make the placeholder lie. `search` is already `formatSearchTerm`-sanitised,
    // so `,` and the `%*,()` characters that would let a value break out of the
    // filter clause are gone.
    const pattern = `%${search}%`;
    query = query.or(
      `name.ilike.${pattern},email.ilike.${pattern},company.ilike.${pattern}`,
    );
  }

  const { data, error, count } = await query;

  if (error) return <ClientsErrorState code={error.code} />;

  // `createClient()` is built without the generated `Database` generic, so
  // PostgREST types `data` as `any`. Re-typed once, here, at the boundary.
  const clients = (data ?? []) as Client[];
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

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
          hasSearch={search !== undefined}
          clearSearchHref={buildHref(params, { drop: ["search", "page"] })}
        />
      ) : (
        <ClientsPagination
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
 * someone who searched for "acme" that they have no clients yet would invite
 * them to create the record they were just looking for.
 */
function ClientsEmptyState({
  hasSearch,
  clearSearchHref,
}: {
  hasSearch: boolean;
  clearSearchHref: string;
}) {
  if (hasSearch) {
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
              Probá con otro nombre, email o empresa.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            render={<a href={clearSearchHref}>Limpiar búsqueda</a>}
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

function ClientsPagination({
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
 */
function ClientsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-4 w-24" />
      </div>

      <div className="hidden md:block">
        <Card className="py-0">
          <CardContent className="space-y-4 px-4 py-4">
            <Skeleton className="h-4 w-full max-w-md" />
            {[0, 1, 2, 3, 4].map((index) => (
              <div key={index} className="flex items-center gap-4">
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="hidden h-4 flex-1 lg:block" />
                <Skeleton className="hidden h-4 w-40 lg:block" />
                <Skeleton className="h-4 w-20 shrink-0" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3 md:hidden">
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
