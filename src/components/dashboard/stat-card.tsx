import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { StatCardMotion } from "@/components/dashboard/stat-card-motion";
import { Card, CardContent } from "@/components/ui/card";

type IconColor = "primary" | "info" | "success" | "warning" | "danger";

const ICON_COLOR_CLASSES: Record<IconColor, { container: string; icon: string }> =
  {
    primary: { container: "bg-primary/10", icon: "text-primary" },
    info: { container: "bg-info/10", icon: "text-info" },
    success: { container: "bg-success/12", icon: "text-success" },
    warning: { container: "bg-warning/15", icon: "text-warning" },
    danger: { container: "bg-danger/12", icon: "text-danger" },
  };

/**
 * KPI tile. With `href` the whole tile is one link (a single focus stop and a
 * large click target) to the list the number comes from, so every figure is one
 * click away from the rows behind it. `valueTone="danger"` colours the number
 * itself, reserved for the delayed count so the brick orange keeps meaning
 * "needs attention".
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  iconColor = "primary",
  href,
  hint,
  valueTone,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  iconColor?: IconColor;
  href?: string;
  hint?: string;
  valueTone?: "danger";
}) {
  const colors = ICON_COLOR_CLASSES[iconColor];

  const card = (
    <Card
      className={
        href
          ? "group transition-colors duration-150 group-hover/link:border-primary/50"
          : undefined
      }
    >
      <CardContent className="flex min-h-[108px] items-start justify-between gap-4 px-5">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>

          <p
            className={`text-[34px] leading-none font-semibold tracking-tight tabular-nums ${
              valueTone === "danger" ? "text-danger" : "text-foreground"
            }`}
          >
            {value}
          </p>

          {hint ? (
            <p className="text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>

        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${colors.container} ${colors.icon}`}
          aria-hidden="true"
        >
          <Icon className="size-5" strokeWidth={1.8} />
        </span>
      </CardContent>
    </Card>
  );

  return (
    <StatCardMotion>
      {href ? (
        <Link
          href={href}
          className="group/link block h-full rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          aria-label={`${label}: ${value}. Ver listado`}
        >
          {card}
        </Link>
      ) : (
        card
      )}
    </StatCardMotion>
  );
}
