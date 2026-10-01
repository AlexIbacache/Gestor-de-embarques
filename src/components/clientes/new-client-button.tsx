"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { ClientForm } from "@/components/clientes/client-form";
import { Button } from "@/components/ui/button";

/**
 * Create trigger for the clients list.
 *
 * This file exists only because `"use client"` is FILE-scoped. Putting the
 * directive on `clientes/page.tsx` to host this state would turn the whole page
 * into a Client Component, dragging its Supabase queries and the `searchParams`
 * await into the browser. Two extra lines of module scope are cheaper than that.
 */
export function NewClientButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus data-icon="inline-start" />
        Nuevo cliente
      </Button>

      {/* Controlled form, rendered once. `client` stays undefined, so this is
          create mode. */}
      <ClientForm open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
