"use client";

import { type FormEvent } from "react";
import { useRouter } from "next/navigation";

import type { SidebarUser } from "@/components/layout/sidebar";
import { Input } from "@/components/ui/input";

/**
 * `/embarques` is the only list wired to server-side search (`?search=`), so
 * the quick search always lands there rather than guessing the current section.
 */
const SEARCH_PATH = "/embarques";

/**
 * Navigational only: it owns no search state and filters nothing locally. The
 * term is read from the form and pushed into `?search=`, which the
 * `/embarques` Server Component reads as its source of truth, so the resulting
 * URL stays shareable and back/forward works.
 *
 * Uncontrolled `Input` inside a real `<form>`: Enter submits natively, and the
 * `FormData` read is the only place the value is touched.
 *
 * Desktop only. The header itself is `hidden md:flex`, so this input never
 * renders below `md`; small viewports reach search through the `MobileNav`
 * shortcut to `/embarques`, which owns its own filter field.
 */
function QuickSearch() {
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const term = String(
      new FormData(event.currentTarget).get("search") ?? "",
    ).trim();

    router.push(
      term ? `${SEARCH_PATH}?search=${encodeURIComponent(term)}` : SEARCH_PATH,
    );
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className="hidden w-64 md:block"
    >
      <Input
        name="search"
        type="search"
        placeholder="Buscar embarques"
        aria-label="Buscar embarques"
      />
    </form>
  );
}

export function Header({ user }: { user: SidebarUser }) {
  return (
    <header className="sticky top-0 z-30 hidden h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur md:flex">
      {/* No <h1> here: each page owns its own heading. This is app context only,
          the current section is not known up here. */}
      <span className="truncate text-sm text-muted-foreground">
        Gestor de Embarques
      </span>

      <div className="ml-auto flex min-w-0 items-center gap-3">
        <QuickSearch />

        {/* `min-w-0` + `truncate` so a long email cannot push the bar wide and
            cause horizontal overflow. */}
        <div className="min-w-0 text-right">
          <p className="truncate text-sm font-medium" title={user.name}>
            {user.name}
          </p>
          <p
            className="hidden truncate text-xs text-muted-foreground sm:block"
            title={user.email}
          >
            {user.email}
          </p>
        </div>
      </div>
    </header>
  );
}
