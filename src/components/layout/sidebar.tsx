"use client";

import { Fragment, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  LogOut,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Truck,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Exported because the mobile navigation reuses the same list; a single source
 * of truth keeps the two in sync.
 */
export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/embarques", label: "Embarques", icon: Package },
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

const SIDEBAR_STORAGE_KEY = "sidebar-collapsed";

/**
 * `storage` only fires in *other* tabs, so the current tab dispatches its own
 * event after writing the preference; both feed the same subscription.
 */
const SIDEBAR_CHANGE_EVENT = "sidebar-collapse-change";

function subscribeToCollapse(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(SIDEBAR_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SIDEBAR_CHANGE_EVENT, callback);
  };
}

function getCollapsedSnapshot(): boolean {
  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
}

/**
 * `false` (expanded) on the server and during hydration, so the SSR markup is
 * stable and matches the client's first render; the stored preference is applied
 * on the post-hydration re-render. This is the same pattern as `ThemeToggle`:
 * `useSyncExternalStore` avoids a `useState` + `useEffect` pair, which the React
 * lint rules reject when the effect sets state synchronously.
 */
function getCollapsedServerSnapshot(): boolean {
  return false;
}

/**
 * Segment-boundary match, mirroring the middleware guard: `/dashboard-stats`
 * must not light up `/dashboard`.
 */
function isActiveRoute(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isCollapsed = useSyncExternalStore(
    subscribeToCollapse,
    getCollapsedSnapshot,
    getCollapsedServerSnapshot,
  );

  function handleToggleCollapsed() {
    const next = !isCollapsed;
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
    window.dispatchEvent(new Event(SIDEBAR_CHANGE_EVENT));
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
        "hidden h-dvh shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-200 md:sticky md:top-0 md:flex",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      <div
        className={cn(
          "flex h-16 shrink-0 items-center gap-2.5 px-4",
          isCollapsed && "justify-center px-2",
        )}
      >
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Truck className="size-4" aria-hidden="true" />
        </div>
        {isCollapsed ? null : (
          <span className="truncate font-heading text-sm font-medium">
            Gestor de Embarques
          </span>
        )}
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
                "relative flex items-center overflow-hidden rounded-lg text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                isCollapsed ? "justify-center px-0 py-2" : "gap-3 px-3 py-2",
                isActive
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-primary"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
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
        <Separator />
        <div className={cn("space-y-2 p-3", isCollapsed && "px-2")}>
          {isCollapsed ? null : (
            <div className="min-w-0 px-1">
              <p className="truncate text-sm font-medium" title={user.name}>
                {user.name}
              </p>
              <p
                className="truncate text-xs text-muted-foreground"
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
              isCollapsed
                ? "w-full justify-center px-0"
                : "w-full justify-start gap-2",
            )}
          >
            <LogOut className="size-4 shrink-0" aria-hidden="true" />
            {isCollapsed ? null : isPending ? "Cerrando sesión..." : "Cerrar sesión"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={handleToggleCollapsed}
            aria-controls="sidebar-nav"
            aria-expanded={!isCollapsed}
            aria-label={
              isCollapsed ? "Expandir menú lateral" : "Colapsar menú lateral"
            }
            className={cn(
              isCollapsed
                ? "w-full justify-center px-0"
                : "w-full justify-start gap-2",
            )}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="size-4 shrink-0" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="size-4 shrink-0" aria-hidden="true" />
            )}
            {isCollapsed ? null : "Colapsar menú"}
          </Button>
        </div>
      </div>
    </aside>
  );
}
