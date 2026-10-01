"use client";

import type { ReactNode } from "react";

import { FadeIn } from "@/components/ui/motion";
import { cn } from "@/lib/utils";

/**
 * Motion wrapper for `StatCard`. Isolated in its own file because `motion` only
 * runs on the client: putting `"use client"` here keeps `stat-card.tsx` a
 * Server Component, so the card can be rendered straight from a Server
 * Component without pulling the whole card subtree across the boundary.
 *
 * Delegates to the shared `FadeIn` primitive, which owns the timing values and
 * the `prefers-reduced-motion` collapse, so the dashboard cards cannot drift
 * away from the rest of the motion system.
 *
 * `className` lands on the wrapper — it is the grid item, so it needs `h-full`
 * for the cards to share one row height.
 */
export function StatCardMotion({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <FadeIn className={cn("h-full", className)}>{children}</FadeIn>
  );
}