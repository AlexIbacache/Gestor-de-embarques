import { Suspense } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Clock,
  Package,
  Truck,
} from "lucide-react";

import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { StatCard } from "@/components/dashboard/stat-card";
import { ShipmentStatusBadge } from "@/components/embarques/shipment-status-badge";

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { createClient } from "@/lib/supabase/server";
import { SHIPMENT_STATUS } from "@/lib/domain/shipments";
import { formatDateTime } from "@/lib/utils";

import type { DashboardStats, ShipmentWithClient } from "@/types/database";

/*
 * `.env.local` ships with empty Supabase credentials, so `createClient()`
 * throws if this page is ever evaluated at build time.
 *
 * The middleware already guards the route.
 */
export const dynamic = "force-dynamic";

const RECENT_SHIPMENT_LIMIT = 5;

/** Used when the RPC returns `null` (e.g. an empty database edge response). */
const EMPTY_STATS: DashboardStats = {
  total: 0,
  by_status: {},
  by_modality: {},
  monthly: [],
};

/**
 * Dashboard error copy, keyed by the Postgres/PostgREST code. Same pattern as
 * the Server Action maps (`src/app/actions/clientes.ts`): only the short code is
 * inspected, never the raw message — Supabase errors are English, can name
 * constraints and policies, and are never valid UI copy. Anything unmapped falls
 * back to a generic sentence rather than leaking the technical text.
 */
const DASHBOARD_ERROR_MESSAGES: Record<string, string> = {
  "42501": "No tenés autorización para ver las estadísticas.",
  "42883": "La función de estadísticas todavía no está disponible.",
  PGRST202: "La función de estadísticas todavía no está disponible.",
};

const DASHBOARD_ERROR_FALLBACK =
  "No pudimos cargar el dashboard. Revisá tu conexión e intentá de nuevo.";

export default function DashboardPage() {
  return (
    <Suspense
      key={RECENT_SHIPMENT_LIMIT}
      fallback={<DashboardSkeleton />}
    >
      <DashboardContent />
    </Suspense>
  );
}

/* =========================================================
   DASHBOARD DATA
   ========================================================= */

async function DashboardContent() {
  const supabase = await createClient();

  /*
   * One aggregation call plus the most recent shipments.
   *
   * `get_dashboard_stats()` groups by status, modality and month inside
   * PostgreSQL and returns a single JSON value. It is `security invoker`, so the
   * caller's RLS still applies — it does not bypass policies. No shipment rows
   * are downloaded to be aggregated in JavaScript (design decision D16): the
   * three charts and the KPIs all read this one payload.
   */
  const [statsResult, recentResult] = await Promise.all([
    supabase.rpc("get_dashboard_stats"),

    supabase
      .from("shipments")
      .select("*, client:clients(id, name, company, email)")
      .order("created_at", { ascending: false })
      .limit(RECENT_SHIPMENT_LIMIT),
  ]);

  const firstError = statsResult.error ?? recentResult.error ?? null;

  /* =========================================================
     ERROR STATE
     ========================================================= */

  if (firstError) {
    return <DashboardErrorState code={firstError.code} />;
  }

  // `createClient()` is built without the generated `Database` generic, so the
  // RPC payload is typed `any`. Re-typed once, here, at the boundary.
  const stats = (statsResult.data as DashboardStats | null) ?? EMPTY_STATS;

  const shipments = (recentResult.data ?? []) as ShipmentWithClient[];

  // The RPC supplies every counter; the KPIs read it instead of issuing extra
  // `head: true` count queries.
  const total = stats.total;
  const inTransit = stats.by_status[SHIPMENT_STATUS.IN_TRANSIT] ?? 0;
  const delayed = stats.by_status[SHIPMENT_STATUS.DELAYED] ?? 0;

  /* =========================================================
     DASHBOARD
     ========================================================= */

  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-[1600px] space-y-6 p-5 md:p-8">

        {/* =====================================================
            HEADER
            ===================================================== */}

        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Dashboard
          </h1>

          <p className="text-sm text-muted-foreground">
            Resumen general de tus embarques
          </p>
        </div>

        {/* =====================================================
            KPI CARDS
            ===================================================== */}

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Embarques totales"
            value={total}
            icon={Package}
            iconColor="primary"
          />

          <StatCard
            label="En tránsito"
            value={inTransit}
            icon={Truck}
            iconColor="info"
          />

          <StatCard
            label="Retrasados"
            value={delayed}
            icon={Clock}
            iconColor="danger"
          />
        </div>

        {/* =====================================================
            CHARTS
            ===================================================== */}

        <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
          <DashboardCharts stats={stats} mode="status" />

          <DashboardCharts stats={stats} mode="modality" />
        </div>

        {/* =====================================================
            TIMELINE
            ===================================================== */}

        <DashboardCharts stats={stats} mode="timeline" />

        {/* =====================================================
            RECENT SHIPMENTS
            ===================================================== */}

        <Card className="overflow-hidden rounded-2xl border-0 bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold">
                Últimos embarques
              </CardTitle>

              <p className="text-sm text-muted-foreground">
                Actividad reciente
              </p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/embarques" />}
            >
              Ver todos
            </Button>
          </CardHeader>

          <CardContent>
            {shipments.length === 0 ? (
              <NoShipmentsYet />
            ) : (
              <ul>
                {shipments.map((shipment, index) => (
                  <li key={shipment.id}>
                    {index > 0 ? (
                      <Separator className="my-2" />
                    ) : null}

                    <Link
                      href={`/embarques/${shipment.id}`}
                      className="
                        flex flex-col gap-3 rounded-xl px-3 py-3
                        transition-colors hover:bg-muted/60
                        focus-visible:outline-none
                        focus-visible:ring-[3px]
                        focus-visible:ring-ring/50
                        sm:flex-row sm:items-center
                        sm:justify-between
                      "
                    >
                      {/* Shipment information */}

                      <div className="min-w-0 space-y-0.5">
                        <p className="truncate font-medium">
                          {shipment.reference}
                        </p>

                        <p className="truncate text-sm text-muted-foreground">
                          {shipment.client?.name ?? "Sin cliente"}
                        </p>
                      </div>

                      {/* Status + date */}

                      <div className="flex items-center gap-3 sm:shrink-0">
                        <ShipmentStatusBadge
                          status={shipment.status}
                        />

                        <time
                          dateTime={shipment.created_at}
                          className="
                            whitespace-nowrap
                            text-sm text-muted-foreground
                          "
                        >
                          {formatDateTime(
                            shipment.created_at
                          )}
                        </time>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* =========================================================
   ERROR STATE
   ========================================================= */

/**
 * Renders a user-safe Spanish message, never the raw Supabase/PostgreSQL error.
 * The technical `code` is inspected against {@link DASHBOARD_ERROR_MESSAGES};
 * the mapped sentence is what the visitor reads. Retry is a full reload via a
 * plain `<a>` (a Server Component cannot call `useRouter`), which also works
 * without JavaScript.
 */
function DashboardErrorState({ code }: { code?: string }) {
  const message =
    (code ? DASHBOARD_ERROR_MESSAGES[code] : undefined) ??
    DASHBOARD_ERROR_FALLBACK;

  return (
    <div className="min-h-full p-5 md:p-8">
      <div className="mx-auto max-w-[1600px]">
        <Alert variant="destructive">
          <AlertCircle />

          <AlertTitle>No pudimos cargar el dashboard</AlertTitle>

          <AlertDescription>{message}</AlertDescription>

          <AlertAction>
            <Button
              variant="outline"
              size="sm"
              render={<a href="/dashboard" />}
            >
              Reintentar
            </Button>
          </AlertAction>
        </Alert>
      </div>
    </div>
  );
}

/* =========================================================
   EMPTY STATE
   ========================================================= */

function NoShipmentsYet() {
  return (
    <div
      className="
        flex flex-col items-center gap-3
        rounded-2xl border border-dashed
        border-border bg-muted/20
        py-12 text-center
      "
    >
      <span
        className="
          flex size-11 items-center justify-center
          rounded-xl bg-primary/15 text-primary
        "
        aria-hidden="true"
      >
        <Package className="size-5" />
      </span>

      <div className="space-y-1">
        <p className="font-medium">
          No hay embarques
        </p>

        <p className="text-sm text-muted-foreground">
          Cuando cargues tu primer embarque,
          aparecerá acá.
        </p>
      </div>

      <Button
        size="sm"
        render={<Link href="/embarques" />}
      >
        <Package data-icon="inline-start" />
        Crear el primero
      </Button>
    </div>
  );
}

