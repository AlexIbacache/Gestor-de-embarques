import type { LucideIcon } from "lucide-react";

import { StatCardMotion } from "@/components/dashboard/stat-card-motion";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Single headline metric for the dashboard: a muted label, the number, and an
 * icon in a tinted square.
 *
 * Server Component on purpose. The only interactive piece is the fade-in, and
 * that lives in the `StatCardMotion` client wrapper, so nothing here forces the
 * caller to be a Client Component.
 *
 * `value` is rendered raw on purpose. `toLocaleString` without an explicit
 * locale resolves differently on the server and in the browser, which is a
 * hydration mismatch; counts below a few thousand read fine unformatted.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
}) {
  return (
    <StatCardMotion>
      <Card>
        <CardContent className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold">{value}</p>
          </div>
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
            aria-hidden="true"
          >
            <Icon className="size-5" />
          </span>
        </CardContent>
      </Card>
    </StatCardMotion>
  );
}