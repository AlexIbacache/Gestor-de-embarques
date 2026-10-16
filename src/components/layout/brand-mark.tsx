import { cn } from "@/lib/utils";

/**
 * Logo mark: a shipping container seen from the side. Corrugated wall (the
 * vertical ribs), top and bottom rails and the four corner castings are what
 * make a container read as a container at 32px, so those are the details kept.
 * Drawn to sit on the navy sidebar/login surface, so it is filled from the
 * sidebar tokens and follows the active theme.
 *
 * Decorative by default (`aria-hidden`): it always sits next to the product
 * name, so announcing it would only repeat "Gestor de Embarques".
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("size-8 shrink-0", className)}
    >
      {/* Body */}
      <rect
        x="1.5"
        y="7"
        width="29"
        height="18"
        rx="1.5"
        fill="var(--sidebar-primary)"
      />
      {/* Corrugation: grooves between the ribs */}
      <path
        d="M7 9.5v13M11.5 9.5v13M16 9.5v13M20.5 9.5v13M25 9.5v13"
        stroke="var(--sidebar)"
        strokeOpacity=".4"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* Top and bottom rails */}
      <path
        d="M1.5 9h29M1.5 23h29"
        stroke="var(--sidebar)"
        strokeOpacity=".55"
        strokeWidth="1.2"
      />
      {/* Corner castings */}
      <g fill="var(--sidebar)" fillOpacity=".75">
        <rect x="1.5" y="7" width="3.4" height="3.4" rx=".6" />
        <rect x="27.1" y="7" width="3.4" height="3.4" rx=".6" />
        <rect x="1.5" y="21.6" width="3.4" height="3.4" rx=".6" />
        <rect x="27.1" y="21.6" width="3.4" height="3.4" rx=".6" />
      </g>
    </svg>
  );
}

/** Mark + product name, the lockup used on navy surfaces. */
export function BrandLockup({
  className,
  showName = true,
}: {
  className?: string;
  showName?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <BrandMark />
      {showName ? (
        <div className="min-w-0 leading-tight">
          <p className="truncate font-heading text-[15px] font-semibold text-sidebar-accent-foreground">
            Gestor de Embarques
          </p>
          <p className="truncate text-xs text-sidebar-foreground/70">
            Logística marítima
          </p>
        </div>
      ) : null}
    </div>
  );
}
