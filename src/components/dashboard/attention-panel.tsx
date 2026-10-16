import Link from "next/link";
import { AlertTriangle, CheckCircle2, Flag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AttentionItem } from "@/types/database";

/** "1 día" / "3 días": the count and its noun always agree. */
function formatDays(days: number): string {
  return days === 1 ? "1 día" : `${days} días`;
}

function describe(item: AttentionItem): string {
  if (item.kind === "retraso") {
    return item.days > 0
      ? `Retrasado: la ETA venció hace ${formatDays(item.days)}.`
      : "Retrasado: la ETA es hoy.";
  }

  return `El hito «${item.milestone}» venció hace ${formatDays(item.days)}.`;
}

/**
 * "Requiere atención" card for the dashboard: delayed shipments first, then
 * milestones whose planned date has passed without an actual date.
 *
 * The facts come from `get_attention_items()` (RLS applies, at most 10 rows);
 * the sentence is composed here because the database only returns data. Pass
 * `items={null}` when the RPC failed: the panel degrades to a short notice
 * instead of taking the whole dashboard down with it.
 *
 * Server Component: static markup and links, no state.
 */
export function AttentionPanel({ items }: { items: AttentionItem[] | null }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-semibold">
            Requiere atención
          </CardTitle>
          {items && items.length > 0 ? (
            <Badge variant="secondary" className="bg-warning/15 text-warning">
              {items.length}
            </Badge>
          ) : null}
        </div>
      </CardHeader>

      <CardContent>
        {items === null ? (
          <p className="text-sm text-muted-foreground">
            No pudimos cargar los avisos. Actualizá la página para reintentar.
          </p>
        ) : items.length === 0 ? (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <CheckCircle2
              className="size-5 shrink-0 text-success"
              aria-hidden="true"
            />
            Todo en orden: no hay retrasos ni hitos vencidos.
          </div>
        ) : (
          <ul className="divide-y">
            {items.map((item) => {
              const Icon = item.kind === "retraso" ? AlertTriangle : Flag;

              return (
                <li
                  key={`${item.shipment_id}-${item.milestone ?? "eta"}`}
                  className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning"
                  >
                    <Icon className="size-4" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      <span className="font-mono">{item.reference}</span>
                      {" · "}
                      {item.company}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {describe(item)}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href={`/embarques/${item.shipment_id}`} />}
                    aria-label={`Ver embarque ${item.reference}`}
                  >
                    Ver embarque
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
