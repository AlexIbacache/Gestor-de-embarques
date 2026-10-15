"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

/**
 * `/embarques` is the only list wired to server-side search (`?search=`), so
 * global search always lands there rather than guessing the current section.
 * Exported so the desktop `QuickSearch` in the header uses the same destination.
 */
export const SEARCH_PATH = "/embarques";

/**
 * Global search surface for touch viewports. The mobile bar previously carried
 * an icon that merely linked to `/embarques`; this exposes a real text input so
 * the term can be typed and submitted, exactly like the desktop header input.
 *
 * The dialog owns its own trigger button. Navigation pushes the same
 * `?search=` URL the header produces, so the destination stays shareable and
 * back/forward work; the term is URL-encoded.
 */
export function SearchDialog({ className }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const term = String(
      new FormData(event.currentTarget).get("search") ?? "",
    ).trim();

    setOpen(false);
    router.push(
      term ? `${SEARCH_PATH}?search=${encodeURIComponent(term)}` : SEARCH_PATH,
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="Buscar embarques"
            className={className}
          />
        }
      >
        <Search className="size-5" aria-hidden="true" />
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buscar embarques</DialogTitle>
          <DialogDescription>
            Escribe una referencia, cliente u origen para buscar en el listado.
          </DialogDescription>
        </DialogHeader>

        {/* A real form: Enter (and the mobile keyboard "go" action) submits
            natively, and the dialog is dismissible with Escape or the backdrop. */}
        <form
          role="search"
          onSubmit={handleSubmit}
          className="flex items-center gap-2"
        >
          <Input
            name="search"
            type="search"
            placeholder="Buscar embarques"
            aria-label="Buscar embarques"
            className="min-w-0 flex-1"
          />
          <Button type="submit">Buscar</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
