import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

/**
 * Route-level loading UI for `/dashboard`. Next renders it while the page's
 * Server Component resolves, so navigation shows the skeleton structure instead
 * of a blank screen. Reuses the same component as the page's `Suspense` fallback.
 */
export default function Loading() {
  return <DashboardSkeleton />;
}
