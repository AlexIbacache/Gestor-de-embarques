import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle, ChevronLeft } from "lucide-react";

import { ShipmentDetail } from "@/components/embarques/shipment-detail";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { shipmentIdSchema } from "@/lib/validations/shipment";
import type { ShipmentWithClient } from "@/types/database";

// `.env.local` ships with empty Supabase credentials, so `createClient()` throws
// if this page is ever evaluated at build time. The middleware already guards
// the route; this matches the reasoning in the `(dashboard)` layout, the login
// page, the dashboard, the clients page and the embarques list.
export const dynamic = "force-dynamic";

/**
 * Next 15+ delivers route `params` as a Promise, so it is typed as one and
 * awaited before use. Typing it as `{ id: string }` would still compile against
 * the generated types and then destructure a Promise into `undefined`.
 */
type Params = Promise<{ id: string }>;

const EMBARQUES_PATH = "/embarques";

export default async function ShipmentPage({ params }: { params: Params }) {
  const { id } = await params;

  /**
   * Validate the segment before it reaches the database. `id` is
   * attacker-controlled path input, and `.eq("id", ...)` is parameterised by
   * supabase-js so it is not an injection vector — but an arbitrary string
   * would still cost a round-trip and cannot match a `uuid` column. A shape
   * that can never identify a row is indistinguishable from a bad link, so it
   * takes the same `notFound()` path rather than a query that is guaranteed to
   * come back empty.
   */
  const parsed = shipmentIdSchema.safeParse({ id });
  if (!parsed.success) notFound();

  // `.trim()` in the schema means this is the normalised value, not the raw
  // segment; using the parsed one keeps the query and the retry link identical.
  const shipmentId = parsed.data.id;

  const supabase = await createClient();

  /**
   * `maybeSingle()` rather than `single()`: it reports zero rows as
   * `data: null` *without* raising an error, which is what lets the two
   * failure modes below be told apart. `single()` collapses them.
   */
  const { data, error } = await supabase
    .from("shipments")
    .select("*, client:clients(id, name, company, email)")
    .eq("id", shipmentId)
    .maybeSingle();

  /**
   * A transport failure and a missing row are different outcomes and are
   * rendered differently. `error` means the request never completed — the
   * network dropped, the session expired, PostgREST refused — so the row may
   * well exist. Reporting that as "not found" would tell the user their link is
   * broken when the real problem is the server, and would send them to look for
   * a typo they never made.
   *
   * This branch returns early because `notFound()` below *throws*: it cannot be
   * deferred into the JSX as a ternary the way `error ? A : B` can. `BackLink`
   * exists so both returns keep the same navigation.
   */
  if (error) {
    return (
      <div className="space-y-6">
        <BackLink />
        <ShipmentErrorState code={error.code} href={`${EMBARQUES_PATH}/${shipmentId}`} />
      </div>
    );
  }

  // No error, no row: the shipment genuinely does not exist (or RLS hid it).
  if (!data) notFound();

  /**
   * `createClient()` is built without the generated `Database` generic, so
   * PostgREST types `data` as `any`. Re-typed once, here, at the boundary —
   * `ShipmentDetail` receives a real type and the cast does not spread.
   */
  const shipment = data as ShipmentWithClient;

  return (
    <div className="space-y-6">
      <BackLink />
      <ShipmentDetail shipment={shipment} />
    </div>
  );
}

/**
 * Base UI `render` swaps the underlying element for a `next/link`, so the
 * destination stays a client-side navigation while the button styling is reused
 * verbatim. This is the `render` prop, not Radix's `asChild`; children go on
 * `Button`, not inside the element.
 */
function BackLink() {
  return (
    <Button variant="ghost" size="sm" render={<Link href={EMBARQUES_PATH} />}>
      <ChevronLeft data-icon="inline-start" />
      Volver a embarques
    </Button>
  );
}

/**
 * Supabase error *messages* are English, can name constraint and RLS policy
 * details, and are never valid UI copy — `src/app/actions/embarques.ts` maps
 * error codes for exactly this reason. Only the short, non-sensitive code is
 * surfaced, alongside the Spanish sentence the user actually reads.
 */
function ShipmentErrorState({ code, href }: { code?: string; href: string }) {
  return (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertTitle>No pudimos cargar el embarque</AlertTitle>
      <AlertDescription>
        No se pudo completar la consulta. Revisá tu conexión e intentá de nuevo.
        {code ? (
          <span className="mt-1 block font-mono text-xs opacity-80">
            Código: {code}
          </span>
        ) : null}
      </AlertDescription>
      <AlertAction>
        {/*
          Plain `<a>`, not `router.refresh()`: a Server Component cannot call
          `useRouter`, and a `"use client"` directive cannot be scoped to this
          one component in the file without turning the page — and its Supabase
          query — into a Client Component. A full reload re-runs the query, is
          honest about what happened, and works without JavaScript.
        */}
        <Button variant="outline" size="sm" render={<a href={href}>Reintentar</a>} />
      </AlertAction>
    </Alert>
  );
}
