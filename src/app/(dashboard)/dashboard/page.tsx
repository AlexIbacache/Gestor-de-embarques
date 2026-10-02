import { Suspense } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Clock,
  Package,
  Truck,
} from "lucide-react";

import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
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
import { Skeleton } from "@/components/ui/skeleton";

import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";

import type { ShipmentWithClient } from "@/types/database";

/*
 * `.env.local` ships with empty Supabase credentials, so `createClient()`
 * throws if this page is ever evaluated at build time.
 *
 * The middleware already guards the route.
 */
export const dynamic = "force-dynamic";

const RECENT_SHIPMENT_LIMIT = 5;

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
   * All aggregates are executed in PostgreSQL through Supabase.
   *
   * The three counts use `head: true`, so the actual rows do not
   * cross the network.
   *
   * Status filters are applied directly in the database.
   */
  const [
    { count: total, error: totalError },
    { count: inTransit, error: inTransitError },
    { count: delayed, error: delayedError },
    { data: recent, error: recentError },
    { data: statusData, error: statusError },
    { data: modalityData, error: modalityError },
    { data: timelineData, error: timelineError },
  ] = await Promise.all([
    supabase
      .from("shipments")
      .select("*", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("shipments")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("status", "En tránsito"),

    supabase
      .from("shipments")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("status", "Retrasado"),

    supabase
      .from("shipments")
      .select(
        "*, client:clients(id, name, company, email)"
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(RECENT_SHIPMENT_LIMIT),

    supabase
      .from("shipments")
      .select("status"),

    supabase
      .from("shipments")
      .select("modality"),

    supabase
      .from("shipments")
      .select("created_at"),
  ]);

  const firstError =
    totalError ??
    inTransitError ??
    delayedError ??
    recentError ??
    statusError ??
    modalityError ??
    timelineError ??
    null;

  /* =========================================================
     ERROR STATE
     ========================================================= */

  if (firstError) {
    return (
      <div className="min-h-full bg-[#f5f5f2] p-5 md:p-8">
        <div className="mx-auto max-w-[1600px]">
          <Alert variant="destructive">
            <AlertCircle />

            <AlertTitle>
              No pudimos cargar el dashboard
            </AlertTitle>

            <AlertDescription>
              {firstError.message}
            </AlertDescription>

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

  const shipments = (recent ?? []) as ShipmentWithClient[];

  /* =========================================================
     DASHBOARD
     ========================================================= */

  return (
    <div className="min-h-full bg-[#f5f5f2]">
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
            value={total ?? 0}
            icon={Package}
            iconColor="lime"
          />

          <StatCard
            label="En tránsito"
            value={inTransit ?? 0}
            icon={Truck}
            iconColor="amber"
          />

          <StatCard
            label="Retrasados"
            value={delayed ?? 0}
            icon={Clock}
            iconColor="red"
          />
        </div>

        {/* =====================================================
            CHARTS
            ===================================================== */}

        <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
          <DashboardCharts
            statusData={
              (statusData ?? []) as {
                status: string;
              }[]
            }
            modalityData={
              (modalityData ?? []) as {
                modality: string;
              }[]
            }
            timelineData={
              (timelineData ?? []) as {
                created_at: string;
              }[]
            }
            mode="status"
          />

          <DashboardCharts
            statusData={
              (statusData ?? []) as {
                status: string;
              }[]
            }
            modalityData={
              (modalityData ?? []) as {
                modality: string;
              }[]
            }
            timelineData={
              (timelineData ?? []) as {
                created_at: string;
              }[]
            }
            mode="modality"
          />
        </div>

        {/* =====================================================
            TIMELINE
            ===================================================== */}

        <DashboardCharts
          statusData={
            (statusData ?? []) as {
              status: string;
            }[]
          }
          modalityData={
            (modalityData ?? []) as {
              modality: string;
            }[]
          }
          timelineData={
            (timelineData ?? []) as {
              created_at: string;
            }[]
          }
          mode="timeline"
        />

        {/* =====================================================
            RECENT SHIPMENTS
            ===================================================== */}

        <Card className="overflow-hidden rounded-2xl border-0 bg-white shadow-sm">
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

/* =========================================================
   LOADING SKELETON
   ========================================================= */

function DashboardSkeleton() {
  return (
    <div className="min-h-full bg-[#f5f5f2]">
      <div className="mx-auto max-w-[1600px] space-y-6 p-5 md:p-8">

        {/* Header */}

        <div className="space-y-2">
          <Skeleton className="h-7 w-32 rounded-lg" />
          <Skeleton className="h-4 w-64 rounded-lg" />
        </div>

        {/* KPI cards */}

        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <Card
              key={index}
              className="
                rounded-2xl border-0
                bg-white shadow-sm
              "
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-9 w-20" />
                    <Skeleton className="h-3 w-40" />
                  </div>

                  <Skeleton className="size-10 rounded-xl" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}

        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          {[0, 1].map((index) => (
            <Card
              key={index}
              className="
                overflow-hidden rounded-2xl
                border-0 bg-white shadow-sm
              "
            >
              <CardHeader className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-56" />
              </CardHeader>

              <CardContent>
                <Skeleton className="h-[280px] w-full rounded-xl" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Timeline */}

        <Card
          className="
            overflow-hidden rounded-2xl
            border-0 bg-white shadow-sm
          "
        >
          <CardHeader className="space-y-2">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>

          <CardContent>
            <Skeleton className="h-[280px] w-full rounded-xl" />
          </CardContent>
        </Card>

        {/* Recent shipments */}

        <Card
          className="
            overflow-hidden rounded-2xl
            border-0 bg-white shadow-sm
          "
        >
          <CardHeader className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>

          <CardContent className="space-y-3">
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className="
                  flex items-center justify-between
                  gap-4 rounded-xl px-3 py-3
                "
              >
                <div className="w-full space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>

                <Skeleton
                  className="
                    h-6 w-24 shrink-0
                    rounded-full
                  "
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}