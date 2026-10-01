"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, Search } from "lucide-react";

import { logoutAction } from "@/app/actions/auth";
import { NAV_ITEMS, type SidebarUser } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/**
 * Segment-boundary match, identical to the sidebar's `isActiveRoute` (and to
 * the middleware guard): `/dashboard-stats` must not light up `/dashboard`.
 * The sidebar keeps that helper private and this work unit does not touch it,
 * so the one-liner is restated here.
 */
function isActiveRoute(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNav({ user }: { user: SidebarUser }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="Abrir menú de navegación"
            />
          }
        >
          <Menu className="size-5" aria-hidden="true" />
        </SheetTrigger>

        <SheetContent side="left" className="w-72">
          <SheetHeader>
            <SheetTitle>Menú</SheetTitle>
          </SheetHeader>

          <nav
            aria-label="Navegación principal"
            className="flex flex-col gap-1 px-3"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = isActiveRoute(pathname, item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  // Required: the Sheet is a controlled dialog, so nothing
                  // closes it on navigation and the panel would otherwise stay
                  // open on top of the destination page.
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                    isActive
                      ? "bg-primary/10 font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto">
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
                variant="ghost"
                onClick={() => void logoutAction()}
                className="w-full justify-start gap-2"
              >
                <LogOut className="size-4" aria-hidden="true" />
                Cerrar sesión
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <span className="font-heading text-sm font-medium">
        Gestor de Embarques
      </span>

      {/* Search lives on the shipments list, so the shortcut targets it rather
          than duplicating the input here. */}
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label="Buscar embarques"
        className="ml-auto"
        render={<Link href="/embarques" />}
      >
        <Search className="size-5" aria-hidden="true" />
      </Button>
    </div>
  );
}
