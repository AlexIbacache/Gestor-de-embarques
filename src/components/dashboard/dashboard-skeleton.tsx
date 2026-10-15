import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading placeholder for `/dashboard`, mirroring the KPI row, the two chart
 * cards, the timeline and the recent-shipments list.
 *
 * Extracted from `dashboard/page.tsx` so the `Suspense` fallback and the route
 * `loading.tsx` render the exact same rectangles instead of two drifting copies.
 * Server Component: it owns no state and only emits markup.
 */
export function DashboardSkeleton() {
  return (
    <div className="min-h-full">
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
                bg-card shadow-sm
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
                border-0 bg-card shadow-sm
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
            border-0 bg-card shadow-sm
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
            border-0 bg-card shadow-sm
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
