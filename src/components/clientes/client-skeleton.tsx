import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Placeholder for the `Suspense` boundary and the route `loading.tsx`.
 * Rectangles only — the literal text "Cargando..." is forbidden by the project
 * UI convention.
 *
 * Extracted from `clientes/page.tsx` so the fallback and the route loading file
 * render the exact same markup. Server Component: no state, no hooks.
 */
export function ClientsSkeleton() {
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
