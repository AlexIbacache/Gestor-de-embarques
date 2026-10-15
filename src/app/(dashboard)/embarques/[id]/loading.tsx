import { ShipmentDetailSkeleton } from "@/components/embarques/shipment-detail-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level loading UI for `/embarques/[id]`. Next renders it while the
 * page's Server Component resolves, so navigation shows the detail skeleton
 * instead of a blank screen. The leading block stands in for the "Volver a
 * embarques" link the page renders above the detail.
 */
export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-40 rounded-lg" />
      <ShipmentDetailSkeleton />
    </div>
  );
}
