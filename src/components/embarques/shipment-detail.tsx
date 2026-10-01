import type { ReactNode } from "react";
import {
  ArrowRight,
  Building,
  CalendarClock,
  Clock,
  Container,
  Mail,
  MapPin,
  User,
  type LucideIcon,
} from "lucide-react";

import { ShipmentStatusBadge } from "@/components/embarques/shipment-status-badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { ShipmentWithClient } from "@/types/database";

/** Stand-in for the client block when the joined row is not visible. */
const CLIENT_UNAVAILABLE = "Cliente no disponible";

/**
 * Read-only detail view of a single shipment.
 *
 * Plain Server Component on purpose: every value it renders arrives as a prop
 * and it owns no state, so a `"use client"` boundary would only ship the whole
 * record to the browser for nothing. The page that fetches the row is the
 * Server Component; this stays presentational.
 */
export function ShipmentDetail({
  shipment,
}: {
  shipment: ShipmentWithClient;
}) {
  const { client } = shipment;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              {/* `reference` takes the `<h1>` slot rather than the card title:
                  it is the shipment's human identifier, and every page in this
                  app owns exactly one top-level heading. */}
              <h1 className="text-2xl font-semibold tracking-tight">
                {shipment.reference}
              </h1>
              <p className="text-sm text-muted-foreground">Detalle del embarque</p>
            </div>
            {/* Reused, never recreated: `ShipmentStatusBadge` is the single
                source of truth for the status colour map. Duplicating the
                class strings here would let the two drift apart. */}
            <ShipmentStatusBadge status={shipment.status} />
          </div>
        </CardHeader>
        <CardContent>
          <RouteSummary
            origin={shipment.origin}
            destination={shipment.destination}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardHeading icon={User}>Cliente</CardHeading>
          </CardHeader>
          <CardContent>
            {/*
              `client_id` is a NOT NULL foreign key, so a `null` here means RLS
              hid the related row rather than that the link is broken. Guarded
              anyway: the cast at the query boundary is unchecked, and reading
              `client.company` on a null would take the page down.
            */}
            {client ? (
              <dl className="space-y-3">
                <DetailRow icon={User} label="Nombre" value={client.name} />
                <DetailRow
                  icon={Building}
                  label="Empresa"
                  value={client.company}
                />
                <DetailRow icon={Mail} label="Email" value={client.email} />
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">
                {CLIENT_UNAVAILABLE}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardHeading icon={Container}>Transporte</CardHeading>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              {/* Raw enum value on purpose. A Spanish label map would be a second
                  source of truth for `ShipmentModality` and could disagree with
                  the database check constraint. */}
              <DetailRow
                icon={Container}
                label="Modalidad"
                value={shipment.modality}
              />
              {/* `eta` is a `yyyy-mm-dd` calendar date: `formatDate` parses it
                  at local midnight, which is the intended reading. */}
              <DetailRow
                icon={CalendarClock}
                label="ETA"
                value={formatDate(shipment.eta)}
                dateTime={shipment.eta}
              />
              {/* `created_at` is a `timestamptz`, so it needs `formatDateTime`.
                  `formatDate` would append `T00:00:00` to an already-qualified
                  timestamp and produce an Invalid Date, echoing the raw value
                  back to the user. */}
              <DetailRow
                icon={Clock}
                label="Creado"
                value={formatDateTime(shipment.created_at)}
                dateTime={shipment.created_at}
              />
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Origin and destination with the direction made explicit.
 *
 * The arrow is `aria-hidden`: it restates what the DOM order already conveys
 * (origin first, destination second) and would otherwise be read aloud as
 * "arrow" by a screen reader.
 */
function RouteSummary({
  origin,
  destination,
}: {
  origin: string;
  destination: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      <RouteStop icon={MapPin} label="Origen" value={origin} />
      <span
        className="flex size-8 shrink-0 items-center justify-center self-start rounded-lg bg-primary/10 text-primary sm:self-auto"
        aria-hidden="true"
      >
        {/* Rotated on small screens because the stops stack vertically there. */}
        <ArrowRight className="size-4 rotate-90 sm:rotate-0" />
      </span>
      <RouteStop icon={MapPin} label="Destino" value={destination} />
    </div>
  );
}

function RouteStop({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5" aria-hidden="true" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-0.5 break-words font-medium">{value}</p>
    </div>
  );
}

function CardHeading({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
      <Icon className="size-4" aria-hidden="true" />
      {children}
    </CardTitle>
  );
}

/**
 * One label/value pair. Rendered as `<dt>`/`<dd>` so each card's content is a
 * real description list; HTML allows `div` wrappers between `dl` and `dt`.
 *
 * `dateTime` renders a `<time>` element so the machine-readable original is kept
 * next to the formatted copy.
 */
function DetailRow({
  icon: Icon,
  label,
  value,
  dateTime,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  dateTime?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
        aria-hidden="true"
      >
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 text-sm font-medium break-words">
          {dateTime ? <time dateTime={dateTime}>{value}</time> : value}
        </dd>
      </div>
    </div>
  );
}
