"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SHIPMENT_MODALITIES,
  SHIPMENT_STATUSES,
} from "@/lib/validations/shipment";

const DEBOUNCE_MS = 350;

/**
 * React `key` for the "all" entries. They have to be distinct from every real
 * value, because a duplicated key in the same list makes React reuse the wrong
 * DOM node — and the check mark (`ItemIndicator`) lives in that node.
 */
const ALL_STATUS_KEY = "all-status";
const ALL_MODALITY_KEY = "all-modality";

/**
 * Reads a filter param and keeps it only if it is a value the Select can
 * actually display.
 *
 * A hand-typed or stale URL (`?status=`, `?status=anything`) would otherwise be
 * adopted as the controlled `value`, and Base UI prints that raw string in the
 * trigger because no `items` entry matches it. Normalising on the way *in* means
 * the control and the query can never disagree about what is filtered.
 */
function readFilter(
  searchParams: URLSearchParams,
  name: string,
  allowed: readonly string[],
): string | null {
  const value = searchParams.get(name);
  // `allowed` is widened to `readonly string[]` on purpose: passing the
  // `as const` tuples here directly would make `.includes()` demand one of the
  // literal union members and reject the `string` that `get` returned.
  return value !== null && allowed.includes(value) ? value : null;
}

/**
 * Filter bar for the shipments list. The three controls are three facets of one
 * query, so the URL is the only state: nothing is fetched or filtered here.
 *
 * The text input owns its own text (so it stays responsive while the server
 * round-trips) and reaches the URL after `DEBOUNCE_MS`. The two Selects are
 * discrete choices and write immediately.
 */
export function ShipmentFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Seeded from the URL exactly once, same reasoning as `ClientFilters`: the URL
  // is the *starting* value, not a live reflection of it, or the server response
  // would overwrite what the user has typed in the meantime.
  const [term, setTerm] = useState(() => searchParams.get("search") ?? "");
  // `string | null` rather than the `ShipmentStatus` / `ShipmentModality`
  // unions: `null` is the "all" sentinel (see below) and is also what Base UI
  // hands `onValueChange` when the choice is cleared.
  const [status, setStatus] = useState<string | null>(() =>
    readFilter(searchParams, "status", SHIPMENT_STATUSES),
  );
  const [modality, setModality] = useState<string | null>(() =>
    readFilter(searchParams, "modality", SHIPMENT_MODALITIES),
  );

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A pending debounce must never fire after unmount, or navigating away
  // mid-type would push a navigation onto a dead tree.
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    };
  }, []);

  /**
   * Every navigation goes through here, so the two debounce policies cannot
   * drift apart and the params this component does not own are never dropped.
   *
   * `sort` / `order` are set by the table and are none of this component's
   * business. Rebuilding the query string from the three filters alone would
   * silently reset the ordering on the first keystroke, so the mutation always
   * starts from a copy of the current params.
   */
  function writeParams(next: URLSearchParams) {
    // A narrower result set invalidates the current offset: page 4 of the
    // previous filter can be past the end of the new one. The param is removed
    // rather than set to "1" so the unfiltered first page stays a clean URL.
    next.delete("page");

    const query = next.toString();
    const href = query ? `${pathname}?${query}` : pathname;

    // `replace`, not `push`: a history entry per filter change would make the
    // user press Back once per click to leave the page. `scroll: false`, because
    // the default scrolls to the top and yanks the viewport on every keystroke.
    router.replace(href, { scroll: false });
  }

  /**
   * The single source of truth for the pending debounce.
   *
   * Two writers reading two different `searchParams` snapshots is the whole race:
   * the timer callback closes over the params as they were when it was
   * scheduled, so a Select change landing first would let it fire afterwards and
   * resurrect the pre-Select URL. Cancelling before every other write removes the
   * second writer entirely.
   */
  function cancelPendingSearch() {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }

  function applySearch(value: string) {
    // `value` is captured at keystroke time. Reading `term` inside the timer
    // would read a render that has already been replaced.
    setTerm(value);

    const next = new URLSearchParams(searchParams.toString());
    const trimmed = value.trim();

    if (trimmed) next.set("search", trimmed);
    else next.delete("search");

    writeParams(next);
  }

  /**
   * A Select changed, so it writes the URL with no debounce — the choice is
   * already discrete, there is nothing to wait for.
   */
  function applyFilter(name: string, value: string | null) {
    // First, so the pending search cannot fire after this write. The text the
    // user typed is then folded into *this* navigation below rather than
    // discarded: dropping it would leave the input showing a term the URL no
    // longer carries, with nothing left to ever re-commit it.
    cancelPendingSearch();

    const next = new URLSearchParams(searchParams.toString());

    if (value !== null) next.set(name, value);
    // `?status=` and no `?status=` are different queries — the page has to be
    // able to tell "not filtered" from "filtered by nothing" — so the absent
    // state is an absent param.
    else next.delete(name);

    const trimmed = term.trim();
    if (trimmed) next.set("search", trimmed);
    else next.delete("search");

    writeParams(next);
  }

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setTerm(value);

    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => applySearch(value), DEBOUNCE_MS);
  }

  function handleStatusChange(value: string | null) {
    setStatus(value);
    applyFilter("status", value);
  }

  function handleModalityChange(value: string | null) {
    setModality(value);
    applyFilter("modality", value);
  }

  function handleClearAll() {
    cancelPendingSearch();

    setTerm("");
    setStatus(null);
    setModality(null);

    const next = new URLSearchParams(searchParams.toString());
    next.delete("search");
    next.delete("status");
    next.delete("modality");

    writeParams(next);
  }

  /**
   * Base UI's `items` prop, and the reason the trigger shows a word instead of a
   * raw string. `null` is the first entry of both: it is Base UI's own "no
   * selection" value (`SelectItem` defaults to `value = null`, and
   * `onValueChange` is typed `Value | null`), and `hasNullItemLabel` is what
   * makes a `{ value: null, label }` entry override `SelectValue`'s placeholder.
   *
   * An empty string cannot play that role: `SelectRoot` computes
   * `hasSelectedValue = value != null && serializedValue !== ''`, so `""` is
   * treated as *empty* and would render the placeholder rather than the "all"
   * label. It is also collision-proof in a way a hand-picked magic string is
   * not: the enum members are all non-null strings, and `compareItemEquality`
   * short-circuits nulls to `Object.is`, so no real status can ever match it.
   */
  const statusItems = [
    { value: null, label: "Todos los estados" },
    ...SHIPMENT_STATUSES.map((item) => ({ value: item, label: item })),
  ];
  const modalityItems = [
    { value: null, label: "Todas las modalidades" },
    ...SHIPMENT_MODALITIES.map((item) => ({ value: item, label: item })),
  ];

  const hasActiveFilters =
    term.trim().length > 0 || status !== null || modality !== null;

  return (
    // The row collapses to a stack at `lg`, not `md`, for the same reason the
    // table does: search + two 224px selects + the clear button need ~600px, and
    // at `md` (768px) only ~464px is available once the sidebar and padding are
    // subtracted. The search wrapper is `flex-1 1 0%` around a `min-w-0` input,
    // so instead of overflowing it silently collapsed to zero width and the
    // field disappeared the moment a filter was active. Filters and table switch
    // together, so the whole view is one layout at every width.
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="flex-1">
        {/* Visually hidden rather than dropped: the input is the only control
            here whose purpose is not obvious from the placeholder alone, and an
            `aria-label` would compete with the label element for the same
            announcement. */}
        <Label htmlFor="shipment-filters-search" className="sr-only">
          Buscar embarques
        </Label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="shipment-filters-search"
            // `type="text"`, not `type="search"`: browsers add their own clear
            // affordance, which would sit next to the one below.
            type="text"
            value={term}
            onChange={handleSearchChange}
            placeholder="Buscar por referencia, origen o destino..."
            className="pr-8 pl-8"
          />
          {/* Only mounted when there is something to clear, so the input does
              not shift as the user types. */}
          {term.length > 0 ? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Limpiar búsqueda"
              onClick={() => {
                cancelPendingSearch();
                setTerm("");
                applySearch("");
              }}
              className="absolute top-1/2 right-0.5 -translate-y-1/2"
            >
              <X />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="md:w-56">
        {/* `id` goes on the Root: `SelectTrigger` resolves `idProp ?? rootId`,
            so this is the id of the real focusable `<button role="combobox">`
            and `htmlFor` points at the control itself. */}
        <Label htmlFor="shipment-filters-status" className="sr-only">
          Estado
        </Label>
        <Select
          id="shipment-filters-status"
          items={statusItems}
          value={status}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null} key={ALL_STATUS_KEY}>
              Todos los estados
            </SelectItem>
            {SHIPMENT_STATUSES.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="md:w-56">
        <Label htmlFor="shipment-filters-modality" className="sr-only">
          Modalidad
        </Label>
        <Select
          id="shipment-filters-modality"
          items={modalityItems}
          value={modality}
          onValueChange={handleModalityChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Todas las modalidades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null} key={ALL_MODALITY_KEY}>
              Todas las modalidades
            </SelectItem>
            {SHIPMENT_MODALITIES.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Only rendered when a filter is on, so the bar does not carry a button
          that would do nothing. */}
      {hasActiveFilters ? (
        <Button variant="outline" onClick={handleClearAll} className="self-start md:self-auto">
          Limpiar filtros
        </Button>
      ) : null}
    </div>
  );
}
