"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { ShipmentForm } from "@/components/embarques/shipment-form";
import { Button } from "@/components/ui/button";
import type { Client } from "@/types/database";

type NewShipmentButtonProps = {
  /**
   * Required by `ShipmentForm`: it never calls `createClient` itself, so the
   * `Select` options — and the `hasClients` guard that disables submit on an
   * empty list — are entirely the caller's responsibility. Fetched and passed
   * down by the server page.
   */
  clients: Client[];
};

/**
 * Create trigger for the shipments list.
 *
 * This file exists only because `"use client"` is FILE-scoped. Putting the
 * directive on `embarques/page.tsx` to host this state would turn the whole page
 * into a Client Component, dragging its Supabase queries and the `searchParams`
 * await into the browser — and would drag the client list across with them.
 * Two extra lines of module scope are cheaper than that.
 *
 * The same list is handed to `ShipmentTable`'s edit dialog, so the page fetches
 * it once and passes it to both.
 */
export function NewShipmentButton({ clients }: NewShipmentButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus data-icon="inline-start" />
        Nuevo embarque
      </Button>

      {/* Controlled form, rendered once. `shipment` stays undefined, so this is
          create mode. */}
      <ShipmentForm
        clients={clients}
        open={isOpen}
        onOpenChange={setIsOpen}
      />
    </>
  );
}