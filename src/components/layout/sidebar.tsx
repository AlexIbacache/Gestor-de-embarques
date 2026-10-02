"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  LogOut,
  Package,
  Truck,
  Users,
} from "lucide-react";

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

/**
 * `logoutAction` performs the sign out and issues the redirect on the server,
 * so the button needs no client-side navigation and no `<form action>`.
 */
function handleLogout(): void {
  void logoutAction();
}

export function Sidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();

  return (
    <aside className="hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-white md:flex md:sticky md:top-0">
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
                  ? "bg-gray-50 font-medium text-foreground before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-primary"
                  : "text-muted-foreground hover:bg-gray-50 hover:text-foreground",
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
            className="w-full justify-start gap-2"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Cerrar sesión
          </Button>
        </div>
      </div>
    </aside>
  );
}