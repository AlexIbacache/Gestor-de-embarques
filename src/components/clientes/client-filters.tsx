"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEBOUNCE_MS = 350;

/**
 * Filter bar for the clients list: a free-text search plus a creation-date
 * range. The controls are facets of one query, so the URL is the only state —
 * nothing is fetched or filtered here.
 *
 * The text input owns its own text (so it stays responsive while the server
 * round-trips) and reaches the URL after `DEBOUNCE_MS`. The two `type="date"`
 * inputs are discrete choices and write immediately. The date boundaries are
 * civil `YYYY-MM-DD` values, exactly what a native date input produces, and the
 * server interprets them as UTC day boundaries for `created_at` (see
 * `startOfUtcDay` / `startOfNextUtcDay` in `src/lib/utils.ts`).
 */
export function ClientFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Seeded from the URL exactly once. Reading `searchParams` again on every
  // render would let the server response overwrite whatever the user has typed
  // in the meantime; the URL is only the *starting* value here.
  const [term, setTerm] = useState(() => searchParams.get("search") ?? "");
  const [from, setFrom] = useState(() => searchParams.get("from") ?? "");
  const [to, setTo] = useState(() => searchParams.get("to") ?? "");

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A pending debounce must never fire after unmount, or navigating away
  // mid-type would push a navigation onto a dead tree.
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    };
  }, []);

  /**
   * The single source of truth for the pending debounce, for the same reason as
   * `ShipmentFilters`: a date change landing first would otherwise let the
   * search timer fire afterwards and resurrect the pre-date URL.
   */
  function cancelPendingSearch() {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }

  /**
   * Every navigation goes through here, so the params this component does not
   * own (`sort`, `order`, `pageSize`) are never dropped. A narrower result set
   * invalidates the current offset, so `page` is removed rather than set to 1:
   * page 4 of the previous filter can be past the end of the new one, and the
   * clean first page keeps the URL shareable.
   */
  function writeParams(next: URLSearchParams) {
    next.delete("page");

    const query = next.toString();
    const href = query ? `${pathname}?${query}` : pathname;

    // `replace`, not `push`: a history entry per filter change would make the
    // user press Back once per click to leave the page. `scroll: false`: the
    // default scrolls to the top and yanks the viewport mid-typing.
    router.replace(href, { scroll: false });
  }

  function applySearch(value: string) {
    // Every other param is copied so a search does not throw away the current
    // ordering, page size or date range.
    const next = new URLSearchParams(searchParams.toString());
    const trimmed = value.trim();

    if (trimmed) next.set("search", trimmed);
    else next.delete("search");

    writeParams(next);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setTerm(value);

    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => applySearch(value), DEBOUNCE_MS);
  }

  /**
   * A date changed, so it writes immediately — the choice is discrete and there
   * is nothing to wait for. The pending search is cancelled first so it cannot
   * fire after this write, and the current text is folded into *this*
   * navigation rather than discarded: dropping it would leave the input showing
   * a term the URL no longer carries.
   */
  function applyDate(name: "from" | "to", value: string) {
    cancelPendingSearch();

    const next = new URLSearchParams(searchParams.toString());

    if (value) next.set(name, value);
    else next.delete(name);

    const trimmed = term.trim();
    if (trimmed) next.set("search", trimmed);
    else next.delete("search");

    writeParams(next);
  }

  function handleFromChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setFrom(value);
    applyDate("from", value);
  }

  function handleToChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setTo(value);
    applyDate("to", value);
  }

  function handleClear() {
    // Cancel the pending debounce first, otherwise a term typed before the
    // click would be applied right after the clear.
    cancelPendingSearch();

    setTerm("");
    applySearch("");
  }

  function handleClearAll() {
    cancelPendingSearch();

    setTerm("");
    setFrom("");
    setTo("");

    const next = new URLSearchParams(searchParams.toString());
    next.delete("search");
    next.delete("from");
    next.delete("to");

    writeParams(next);
  }

  const hasActiveFilters = term.trim().length > 0 || from !== "" || to !== "";

  return (
    <div
      role="search"
      className="flex flex-col gap-3 lg:flex-row lg:items-center"
    >
      <div className="relative flex-1 lg:max-w-md">
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

      {/* Native `type="date"` inputs: the value is already `YYYY-MM-DD`, which
          is exactly the URL format, so no parsing is needed on either side. */}
      {/* The labels sit beside their inputs, not above them: a label over the
          field made this group taller than the search box and pushed the date
          inputs out of line with it. Inline, all three controls are one row of
          equal height. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex items-center gap-2">
          <Label
            htmlFor="client-filters-from"
            className="text-sm font-normal text-muted-foreground"
          >
            Desde
          </Label>
          <Input
            id="client-filters-from"
            type="date"
            value={from}
            max={to || undefined}
            onChange={handleFromChange}
            className="w-[160px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label
            htmlFor="client-filters-to"
            className="text-sm font-normal text-muted-foreground"
          >
            Hasta
          </Label>
          <Input
            id="client-filters-to"
            type="date"
            value={to}
            min={from || undefined}
            onChange={handleToChange}
            className="w-[160px]"
          />
        </div>
      </div>

      {/* Only rendered when a filter is on, so the bar does not carry a button
          that would do nothing. */}
      {hasActiveFilters ? (
        <Button
          variant="outline"
          onClick={handleClearAll}
          className="self-start lg:self-center"
        >
          Limpiar filtros
        </Button>
      ) : null}
    </div>
  );
}
