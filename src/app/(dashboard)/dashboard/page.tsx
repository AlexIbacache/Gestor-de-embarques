import { Suspense } from "react";
import Link from "next/link";
import { AlertCircle, Clock, Package, Truck } from "lucide-react";

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

// `.env.local` ships with empty Supabase credentials, so `createClient()` throws
// if this page is ever evaluated at build time. The middleware already guards
// the route; this matches the reasoning in the `(dashboard)` layout and the
// login page.
export const dynamic = "force-dynamic";

const RECENT_SHIPMENT_LIMIT = 5;

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>

      {/* `DashboardContent` awaits Supabase, so the skeleton only reaches the
          browser if the fetching lives inside the boundary. `key` resets the
          boundary when the route is navigated to again. */}
      <Suspense key={RECENT_SHIPMENT_LIMIT} fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}

async function DashboardContent() {
  const supabase = await createClient();

  // Every aggregate runs in PostgreSQL: the three counts only ask for the
  // `Content-Range` header (`head: true`), so no rows cross the wire, and the
  // status filters are `.eq()` clauses rather than JS-side filtering.
  const [
    { count: total, error: totalError },
    { count: inTransit, error: inTransitError },
    { count: delayed, error: delayedError },
    { data: recent, error: recentError },
  ] = await Promise.all([
    supabase.from("shipments").select("*", { count: "exact", head: true }),
    supabase
      .from("shipments")
      .select("*", { count: "exact", head: true })
      .eq("status", "En tránsito"),
    supabase
      .from("shipments")
      .select("*", { count: "exact", head: true })
      .eq("status", "Retrasado"),
    supabase
      .from("shipments")
      .select("*, client:clients(id, name, company, email)")
      .order("created_at", { ascending: false })
      .limit(RECENT_SHIPMENT_LIMIT),
  ]);

  const firstError =
    totalError ?? inTransitError ?? delayedError ?? recentError ?? null;

  if (firstError) {
    return (
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>No pudimos cargar el dashboard</AlertTitle>
        <AlertDescription>{firstError.message}</AlertDescription>
        <AlertAction>
          {/*
            Plain `<a>`, not `router.refresh()`: a Server Component cannot call
            `useRouter`, and a `"use client"` directive cannot be scoped to a
            single component in this file — it would turn the whole page into a
            Client Component and move the data fetching to the client. A full
            reload is honest, works without JavaScript, and re-runs the queries.
          */}
          <Button
            variant="outline"
            size="sm"
            render={<a href="/dashboard">Reintentar</a>}
          />
        </AlertAction>
      </Alert>
    );
  }

  const shipments = (recent ?? []) as ShipmentWithClient[];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Embarques totales" value={total ?? 0} icon={Package} />
        <StatCard label="En tránsito" value={inTransit ?? 0} icon={Truck} />
        <StatCard label="Retrasados" value={delayed ?? 0} icon={Clock} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Últimos embarques</CardTitle>
        </CardHeader>
        <CardContent>
          {shipments.length === 0 ? (
            <NoShipmentsYet />
          ) : (
            <ul>
              {shipments.map((shipment, index) => (
                <li key={shipment.id}>
                  {index > 0 ? <Separator className="my-3" /> : null}
                  <Link
                    href={`/embarques/${shipment.id}`}
                    className="flex flex-col gap-2 rounded-md px-1 py-1 transition-colors hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="truncate font-medium">
                        {shipment.reference}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {shipment.client?.name ?? "Sin cliente"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 sm:shrink-0">
                      <ShipmentStatusBadge status={shipment.status} />
                      <time
                        dateTime={shipment.created_at}
                        className="text-sm whitespace-nowrap text-muted-foreground"
                      >
                        {formatDateTime(shipment.created_at)}
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
  );
}

function NoShipmentsYet() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-10 text-center">
      <span
        className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"
        aria-hidden="true"
      >
        <Package className="size-5" />
      </span>
      <div className="space-y-1">
        <p className="font-medium">No hay embarques</p>
        <p className="text-sm text-muted-foreground">
          Cuando cargues tu primer embarque, aparecerá acá.
        </p>
      </div>
      {/* Base UI `render` swaps the underlying element for a `next/link`, so the
          destination stays a client-side navigation while the button styling is
          reused verbatim. Children go on `Button`, not inside the element. */}
      <Button size="sm" render={<Link href="/embarques" />}>
        <Package data-icon="inline-start" />
        Crear el primero
      </Button>
    </div>
  );
}

/**
 * Placeholder for the `Suspense` boundary. Rectangles only — the literal text
 * "Cargando..." is forbidden by the project UI convention.
 */
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-[85px] rounded-xl" />
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="w-full space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="h-5 w-24 shrink-0 rounded-4xl" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}