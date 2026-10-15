import { ShipmentsSkeleton } from "@/components/embarques/shipment-skeleton";

/**
 * Route-level loading UI for `/embarques`. Next renders it while the page's
 * Server Component resolves, so navigation shows the list skeleton instead of a
 * blank screen. Reuses the same component as the page's `Suspense` fallback.
 */
export default function Loading() {
  return <ShipmentsSkeleton />;
}
