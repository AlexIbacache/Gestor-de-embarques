"use client";

import { Fragment, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Container,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Warehouse,
} from "lucide-react";
import { toast } from "sonner";

import { logoutAction } from "@/app/actions/auth";
import { BrandLockup } from "@/components/layout/brand-mark";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { serializeCollapsedPreference } from "@/lib/sidebar-preference";
import { cn } from "@/lib/utils";

/**
 * Exported because the mobile navigation reuses the same list; a single source
 * of truth keeps the two in sync.
 */
export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clientes", label: "Clientes", icon: Warehouse },
  { href: "/embarques", label: "Embarques", icon: Container },
] as const;

/**
 * Deliberately narrower than the Supabase `User`: crossing the server/client
 * boundary with the whole object would ship `identities`, `factors` and the
 * provider payload to the browser for no reason.
 */
export type SidebarUser = {
  email: string;
  name: string;
};

/**
 * Segment-boundary match, mirroring the middleware guard: `/dashboard-stats`
 * must not light up `/dashboard`.
 */
function isActiveRoute(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({
  user,
  initialCollapsed,
}: {
  user: SidebarUser;
  initialCollapsed: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Seeded from the server-read cookie: the first client render is IDENTICAL to
  // the SSR markup, so there is no hydration mismatch and no flash. The cookie
  // is the source of truth; this state mirrors it for the current tree.
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);

  function handleToggleCollapsed() {
    const next = !isCollapsed;
    setIsCollapsed(next);
    // Not `httpOnly` by necessity: the client owns this write. `path=/` and a
    // long `max-age` (see `serializeCollapsedPreference`) let the server read it
    // on the next request and render the rail already collapsed.
    document.cookie = serializeCollapsedPreference(next);
  }

  /**
   * `logoutAction` signs out and returns the outcome instead of redirecting, so
   * the confirmation toast has time to render. The navigation is issued here,
   * from the client, after the toast is queued. `isPending` disables the button
   * for the whole request, and this guard rejects a second click that lands
   * before React commits the disabled state.
   */
  function handleLogout() {
    if (isPending) return;

    startTransition(async () => {
      const result = await logoutAction();

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Sesión cerrada correctamente.");
      // `replace`, not `push`: the signed-out page must not stay reachable via
      // the browser Back button.
      router.replace("/login");
    });
  }

  return (
    <aside
      data-collapsed={isCollapsed}
      className={cn(
        "hidden h-dvh shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:sticky md:top-0 md:flex",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center",
          // Expanded: brand on the left, toggle on the right. Collapsed: the rail
          // is only 64px wide, so the mark and the toggle stack instead.
          isCollapsed
            ? "flex-col gap-2 px-2 py-3"
            : "h-16 justify-between gap-2 px-4",
        )}
      >
        <BrandLockup showName={!isCollapsed} className="min-w-0" />

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={handleToggleCollapsed}
                aria-controls="sidebar-nav"
                aria-expanded={!isCollapsed}
                aria-label={
                  isCollapsed ? "Expandir menú lateral" : "Colapsar menú lateral"
                }
                className="shrink-0 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              />
            }
          >
            {isCollapsed ? (
              <PanelLeftOpen className="size-4" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="size-4" aria-hidden="true" />
            )}
          </TooltipTrigger>
          <TooltipContent side="right">
            {isCollapsed ? "Expandir menú" : "Colapsar menú"}
          </TooltipContent>
        </Tooltip>
      </div>

      <nav
        id="sidebar-nav"
        aria-label="Navegación principal"
        className={cn(
          "flex flex-1 flex-col gap-1 overflow-y-auto py-2",
          isCollapsed ? "px-2" : "px-3",
        )}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = isActiveRoute(pathname, item.href);
          const Icon = item.icon;

          const link = (
            <Link
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              // Accessible name survives the rail: an icon-only link always
              // carries its label, and the tooltip is an extra affordance.
              aria-label={isCollapsed ? item.label : undefined}
              className={cn(
                "relative flex items-center overflow-hidden rounded-lg text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-sidebar-ring/50 focus-visible:outline-none",
                isCollapsed ? "justify-center px-0 py-1.5" : "gap-3 px-2 py-1.5",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              {/* The icon sits in a chip that lights up for the current page, so
                  the active item reads at a glance even in the collapsed rail. */}
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-md transition-colors",
                  isActive &&
                    "bg-sidebar-primary text-sidebar-primary-foreground",
                )}
              >
                <Icon className="size-[18px]" aria-hidden="true" />
              </span>
              {isCollapsed ? null : (
                <span className="truncate">{item.label}</span>
              )}
            </Link>
          );

          return (
            <Fragment key={item.href}>
              {isCollapsed ? (
                <Tooltip>
                  <TooltipTrigger render={link} />
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              ) : (
                link
              )}
            </Fragment>
          );
        })}
      </nav>

      <div className="shrink-0">
        <Separator className="bg-sidebar-border" />
        <div className={cn("space-y-2 p-3", isCollapsed && "px-2")}>
          {isCollapsed ? null : (
            <div className="min-w-0 px-1">
              <p
                className="truncate text-sm font-medium text-sidebar-accent-foreground"
                title={user.name}
              >
                {user.name}
              </p>
              <p
                className="truncate text-xs text-sidebar-foreground/70"
                title={user.email}
              >
                {user.email}
              </p>
            </div>
          )}

          <Button
            type="button"
            variant="ghost"
            onClick={handleLogout}
            disabled={isPending}
            aria-label={
              isCollapsed
                ? isPending
                  ? "Cerrando sesión"
                  : "Cerrar sesión"
                : undefined
            }
            className={cn(
              "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              isCollapsed
                ? "w-full justify-center px-0"
                : "w-full justify-start gap-2",
            )}
          >
            <LogOut className="size-4 shrink-0" aria-hidden="true" />
            {isCollapsed ? null : isPending ? "Cerrando sesión..." : "Cerrar sesión"}
          </Button>
        </div>
      </div>
    </aside>
  );
}
