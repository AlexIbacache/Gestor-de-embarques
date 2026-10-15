import type { LucideIcon } from "lucide-react";

import { StatCardMotion } from "@/components/dashboard/stat-card-motion";
import { Card, CardContent } from "@/components/ui/card";

type IconColor = "primary" | "info" | "success" | "warning" | "danger";

const ICON_COLOR_CLASSES: Record<
  IconColor,
  {
    container: string;
    icon: string;
    accent: string;
  }
> = {
  primary: {
    container: "bg-primary/10",
    icon: "text-primary",
    accent: "bg-primary",
  },

  info: {
    container: "bg-chart-2/15",
    icon: "text-chart-2",
    accent: "bg-chart-2",
  },

  success: {
    container: "bg-success/15",
    icon: "text-success",
    accent: "bg-success",
  },

  warning: {
    container: "bg-warning/15",
    icon: "text-warning",
    accent: "bg-warning",
  },

  danger: {
    container: "bg-danger/15",
    icon: "text-danger",
    accent: "bg-danger",
  },
};

export function StatCard({
  label,
  value,
  icon: Icon,
  iconColor = "primary",
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  iconColor?: IconColor;
}) {
  const colors = ICON_COLOR_CLASSES[iconColor];

  return (
    <StatCardMotion>
      <Card
        className="
          group
          relative
          overflow-hidden
          rounded-2xl
          border
          border-black/[0.045]
          bg-card
          shadow-[0_2px_10px_rgba(0,0,0,0.025)]
          transition-all
          duration-200
          hover:border-black/[0.07]
          hover:shadow-[0_5px_18px_rgba(0,0,0,0.045)]
        "
      >
        {/* Small colored accent */}

        <div
          className={`
            absolute
            left-0
            top-0
            h-full
            w-1
            opacity-80
            ${colors.accent}
          `}
          aria-hidden="true"
        />

        <CardContent
          className="
            flex
            min-h-[112px]
            items-center
            justify-between
            gap-4
            px-5
            py-5
            md:px-6
          "
        >
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              {label}
            </p>

            <p className="text-[32px] font-semibold leading-none tracking-[-0.03em] text-foreground">
              {value}
            </p>

            <p className="pt-1 text-xs text-muted-foreground/80">
              Registrados en el sistema
            </p>
          </div>

          <span
            className={`
              flex
              size-11
              shrink-0
              items-center
              justify-center
              rounded-xl
              ${colors.container}
              ${colors.icon}
              transition-transform
              duration-200
              group-hover:scale-[1.04]
            `}
            aria-hidden="true"
          >
            <Icon className="size-[21px]" strokeWidth={1.9} />
          </span>
        </CardContent>
      </Card>
    </StatCardMotion>
  );
}