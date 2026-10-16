import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Placeholder for the `loading.tsx` of `/embarques/[id]`. It mirrors the layout
 * `ShipmentDetail` renders — a header card with the reference and the status
 * badge, the origin→destination summary, the milestone timeline, the two detail
 * cards and the notes/history row — so the real content lands in the same slots
 * once the row resolves.
 *
 * Server Component: no state, no hooks.
 */
export function ShipmentDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-8 w-40 rounded-lg" />
              <Skeleton className="h-4 w-32 rounded-lg" />
            </div>
            <Skeleton className="h-6 w-24 shrink-0 rounded-full" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-3/4" />
            </div>

            <Skeleton className="size-8 shrink-0 rounded-lg" />

            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-1.5 w-full rounded-full" />
        </CardHeader>
        <CardContent className="space-y-5">
          {[0, 1, 2, 3, 4].map((rowIndex) => (
            <div key={rowIndex} className="flex items-start gap-3">
              <Skeleton className="size-7 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1].map((cardIndex) => (
          <Card key={cardIndex}>
            <CardHeader>
              <Skeleton className="h-5 w-28" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[0, 1, 2].map((rowIndex) => (
                <div key={rowIndex} className="flex items-start gap-3">
                  <Skeleton className="size-7 shrink-0 rounded-md" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1].map((cardIndex) => (
          <Card key={cardIndex}>
            <CardHeader>
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
