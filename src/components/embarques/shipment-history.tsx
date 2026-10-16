import { History } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import type { ShipmentEvent } from "@/types/database";

/**
 * Newest-first change log of a shipment (`shipment_events`).
 *
 * The rows are written by database triggers, so the list is trustworthy: nobody
 * can add or edit an entry from the app. `actor_email` is null when the change
 * came from the SQL editor (migrations, seed), which is shown as "Sistema".
 */
export function ShipmentHistory({ events }: { events: ShipmentEvent[] }) {
  const ordered = [...events].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
          <History className="size-4" aria-hidden="true" />
          Historial
        </CardTitle>
      </CardHeader>
      <CardContent>
        {ordered.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin movimientos todavía.</p>
        ) : (
          <ul className="divide-y">
            {ordered.map((event) => (
              <li key={event.id} className="py-2.5 first:pt-0 last:pb-0">
                <p className="text-sm font-medium break-words">{event.message}</p>
                <p className="text-xs text-muted-foreground">
                  <time dateTime={event.created_at}>
                    {formatDateTime(event.created_at)}
                  </time>
                  {" · "}
                  {event.actor_email ?? "Sistema"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
