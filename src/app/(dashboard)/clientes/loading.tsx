import { ClientsSkeleton } from "@/components/clientes/client-skeleton";

/**
 * Route-level loading UI for `/clientes`. Next renders it while the page's
 * Server Component resolves, so navigation shows the list skeleton instead of a
 * blank screen. Reuses the same component as the page's `Suspense` fallback.
 */
export default function Loading() {
  return <ClientsSkeleton />;
}
