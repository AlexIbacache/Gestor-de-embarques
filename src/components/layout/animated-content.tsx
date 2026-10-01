"use client";

import type { ReactNode } from "react";

import { FadeIn } from "@/components/ui/motion";

/**
 * Entry animation for page content. Delegates to the shared `FadeIn` primitive,
 * which owns the `opacity 0→1` / `y 10→0` / `easeOut` convention documented in
 * the change task contract and reused verbatim by stat cards and table rows, so
 * every fade/slide-up is the same motion and there is a single place to change a
 * duration.
 *
 * Behaviour is otherwise unchanged: no springs, no stagger, no looping.
 *
 * This is a Client Component on purpose: the dashboard layout is a Server
 * Component and `motion` can only run on the client.
 */
export function AnimatedContent({ children }: { children: ReactNode }) {
  return <FadeIn>{children}</FadeIn>;
}
