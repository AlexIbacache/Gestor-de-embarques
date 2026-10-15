"use client";

import { useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  LogOut,
  Package,
  Truck,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
    <aside className="hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-sidebar md:flex md:sticky md:top-0">
      <div className="flex h-16 shrink-0 items-center gap-2.5 px-4">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Truck className="size-4" aria-hidden="true" />
        </div>
        <span className="font-heading text-sm font-medium">
          Gestor de Embarques
        </span>
      </div>

      <nav
        aria-label="Navegación principal"
        className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = isActiveRoute(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-3 overflow-hidden rounded-lg px-3 py-2 text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                isActive
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-primary"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0">
        <Separator />
        <div className="space-y-2 p-3">
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

          <Button
            type="button"
            variant="ghost"
            onClick={handleLogout}
            disabled={isPending}
            className="w-full justify-start gap-2"
          >
            <LogOut className="size-4" aria-hidden="true" />
            {isPending ? "Cerrando sesión..." : "Cerrar sesión"}
          </Button>
        </div>
      </div>
    </aside>
  );
}