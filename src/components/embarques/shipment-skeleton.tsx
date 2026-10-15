import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Placeholder for the `Suspense` boundary and the route `loading.tsx`.
 * Rectangles only — the literal text "Cargando..." is forbidden by the project
 * UI convention.
 *
 * The filter row is deliberately *not* mirrored here. `ShipmentFilters` is
 * rendered outside the `Suspense` boundary and is already interactive, so a
 * second placeholder underneath it would render two filter bars while the query
 * is in flight and then collapse one of them, shifting everything below it by
 * the height of a row. `ClientsSkeleton` on `/clientes` makes the same choice
 * for the same reason.
 *
 * Extracted from `embarques/page.tsx` so the fallback and the route loading file
 * render the exact same markup. Server Component: no state, no hooks.
 */
export function ShipmentsSkeleton() {
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
