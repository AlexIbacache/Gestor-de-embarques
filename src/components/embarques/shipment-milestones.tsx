import { AlertTriangle, CheckCircle2, Circle, Ship } from "lucide-react";

import { MilestoneDialog } from "@/components/embarques/milestone-dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SHIPMENT_STATUS, type ShipmentStatus } from "@/lib/domain/shipments";
import { cn, formatDate } from "@/lib/utils";
import type { ShipmentMilestone } from "@/types/database";

type Row =
  | { kind: "milestone"; milestone: ShipmentMilestone; state: MilestoneState }
  | { kind: "transit" };

type MilestoneState = "done" | "overdue" | "pending";

/**
 * Timeline of the five fixed milestones of a shipment.
 *
 * Server Component: it only reads props. The one interactive piece, the edit
 * dialog, is its own client island (`MilestoneDialog`), so the dates are not
 * shipped to the browser twice.
 *
 * "En tránsito" is not a stored milestone. It is derived here: Zarpe is done,
 * Arribo is not, and the shipment is not cancelled. Storing it would give the
 * database two dates that could contradict each other.
 *
 * "Today" is the server's UTC date. A milestone planned for today is therefore
 * never flagged as overdue, and the worst case near midnight is flagging it a
 * few hours early or late, which is acceptable for a date-only warning.
 */
export function ShipmentMilestones({
  shipmentId,
  milestones,
  status,
}: {
  shipmentId: string;
  milestones: ShipmentMilestone[];
  status: ShipmentStatus;
}) {
  const ordered = [...milestones].sort((a, b) => a.step - b.step);
  const today = new Date().toISOString().slice(0, 10);

  // Overdue only makes sense while the shipment is still open.
  const isOpen =
    status !== SHIPMENT_STATUS.DELIVERED && status !== SHIPMENT_STATUS.CANCELLED;

  const doneCount = ordered.filter((m) => m.actual_date !== null).length;
  const progress = ordered.length === 0 ? 0 : (doneCount / ordered.length) * 100;

  const departed = ordered.find((m) => m.name === "Zarpe")?.actual_date != null;
  const arrived = ordered.find((m) => m.name === "Arribo")?.actual_date != null;
  const inTransit = departed && !arrived && status !== SHIPMENT_STATUS.CANCELLED;

  const rows: Row[] = [];
  for (const milestone of ordered) {
    const state: MilestoneState = milestone.actual_date
      ? "done"
      : isOpen && milestone.planned_date && milestone.planned_date < today
        ? "overdue"
        : "pending";

    rows.push({ kind: "milestone", milestone, state });

    if (milestone.name === "Zarpe" && inTransit) rows.push({ kind: "transit" });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Hitos del embarque</CardTitle>
          <p className="text-sm text-muted-foreground">
            {doneCount} de {ordered.length} completados
          </p>
        </div>
        <div
          role="progressbar"
          aria-label="Hitos completados"
          aria-valuemin={0}
          aria-valuemax={ordered.length}
          aria-valuenow={doneCount}
          className="h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>
      <CardContent>
        {ordered.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Este embarque todavía no tiene hitos.
          </p>
        ) : (
          <ol className="space-y-0">
            {rows.map((row, index) => {
              const isLast = index === rows.length - 1;

              if (row.kind === "transit") {
                return (
                  <TimelineItem key="transit" isLast={isLast} tone="info">
                    <p className="text-sm font-medium">En tránsito</p>
                    <p className="text-xs text-muted-foreground">
                      La carga ya zarpó y todavía no llegó a destino.
                    </p>
                  </TimelineItem>
                );
              }

              const { milestone, state } = row;

              return (
                <TimelineItem
                  key={milestone.id}
                  isLast={isLast}
                  tone={state}
                  action={
                    <MilestoneDialog
                      shipmentId={shipmentId}
                      milestone={milestone}
                    />
                  }
                >
                  <p
                    className={cn(
                      "text-sm font-medium",
                      state === "pending" && "text-muted-foreground",
                    )}
                  >
                    {milestone.name}
                    <span className="sr-only">
                      {" "}
                      {state === "done"
                        ? "(completado)"
                        : state === "overdue"
                          ? "(vencido)"
                          : "(pendiente)"}
                    </span>
                  </p>
                  <MilestoneDates milestone={milestone} state={state} />
                </TimelineItem>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function MilestoneDates({
  milestone,
  state,
}: {
  milestone: ShipmentMilestone;
  state: MilestoneState;
}) {
  const { planned_date: planned, actual_date: actual } = milestone;

  if (actual) {
    return (
      <p className="text-xs text-muted-foreground">
        Completado el <time dateTime={actual}>{formatDate(actual)}</time>
        {planned && planned !== actual ? (
          <>
            {" · previsto "}
            <time dateTime={planned}>{formatDate(planned)}</time>
          </>
        ) : null}
      </p>
    );
  }

  if (!planned) {
    return <p className="text-xs text-muted-foreground">Sin fecha prevista</p>;
  }

  return (
    <p
      className={cn(
        "text-xs",
        state === "overdue" ? "font-medium text-warning" : "text-muted-foreground",
      )}
    >
      {state === "overdue" ? "Vencido · previsto " : "Previsto "}
      <time dateTime={planned}>{formatDate(planned)}</time>
    </p>
  );
}

const TONE_STYLES = {
  done: "bg-success/15 text-success",
  overdue: "bg-warning/15 text-warning",
  pending: "bg-muted text-muted-foreground",
  info: "bg-primary/10 text-primary",
} as const;

function TimelineItem({
  tone,
  isLast,
  action,
  children,
}: {
  tone: keyof typeof TONE_STYLES;
  isLast: boolean;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const Icon =
    tone === "done"
      ? CheckCircle2
      : tone === "overdue"
        ? AlertTriangle
        : tone === "info"
          ? Ship
          : Circle;

  return (
    <li className="relative flex items-start gap-3 pb-5 last:pb-0">
      {/* Connector to the next row; the last row has nothing below it. */}
      {isLast ? null : (
        <span
          aria-hidden="true"
          className="absolute top-8 bottom-0 left-3.5 w-px -translate-x-1/2 bg-border"
        />
      )}
      <span
        aria-hidden="true"
        className={cn(
          "relative flex size-7 shrink-0 items-center justify-center rounded-full",
          TONE_STYLES[tone],
        )}
      >
        <Icon className={cn("size-4", tone === "info" && "motion-safe:animate-pulse")} />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">{children}</div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </li>
  );
}
