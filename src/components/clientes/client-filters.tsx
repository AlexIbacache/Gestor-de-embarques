"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DEBOUNCE_MS = 350;

/**
 * Search box for the clients list.
 *
 * The input owns its own text; the URL owns the result set. Keystrokes update
 * the input immediately and reach the URL after `DEBOUNCE_MS`, so the server is
 * not asked to re-render the list once per character.
 */
export function ClientFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Seeded from the URL exactly once. Reading `searchParams` again on every
  // render would let the server response overwrite whatever the user has typed
  // in the meantime; the URL is only the *starting* value here.
  const [term, setTerm] = useState(() => searchParams.get("search") ?? "");

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A pending debounce must never fire after unmount, or navigating away
  // mid-type would push a navigation onto a dead tree.
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    };
  }, []);

  function applySearch(value: string) {
    // Every other param (`sort`, `order`) is copied so a search does not throw
    // away the current ordering.
    const next = new URLSearchParams(searchParams.toString());
    const trimmed = value.trim();

    if (trimmed) next.set("search", trimmed);
    else next.delete("search");

    // A narrower result set invalidates the current offset.
    next.delete("page");

    const query = next.toString();
    const href = query ? `${pathname}?${query}` : pathname;

    // `replace`, not `push`: one history entry per debounce window would make
    // the user press Back once per search to leave the page. `scroll: false`:
    // the default scrolls to the top, which yanks the viewport mid-typing.
    router.replace(href, { scroll: false });
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setTerm(value);

    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => applySearch(value), DEBOUNCE_MS);
  }

  function handleClear() {
    // Cancel the pending debounce first, otherwise a term typed before the
    // click would be applied right after the clear.
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setTerm("");
    applySearch("");
  }

  return (
    <div role="search">
      <div className="relative max-w-md">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          // `type="text"`, not `type="search"`: browsers add their own clear
          // affordance for search inputs, which would sit next to this one.
          type="text"
          value={term}
          onChange={handleChange}
          placeholder="Buscar por nombre, email o empresa..."
          aria-label="Buscar clientes"
          className="pr-8 pl-8"
        />
        {/* Only rendered when there is something to clear, so the input does not
            shift as the user types. */}
        {term.length > 0 ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Limpiar búsqueda"
            onClick={handleClear}
            className="absolute top-1/2 right-0.5 -translate-y-1/2"
          >
            <X />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
