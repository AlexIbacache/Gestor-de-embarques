"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

/**
 * Wrapper que añade una elevación sutil al hacer hover.
 * Respeta `prefers-reduced-motion` colapsando la transición a duración 0.
 */
export function HoverElevation({
  children,
  className,
  scale = 1.01,
  y = -2,
}: {
  children: ReactNode;
  className?: string;
  scale?: number;
  y?: number;
}) {
  const collapse = useReducedMotion() === true;

  return (
    <motion.div
      className={className}
      whileHover={collapse ? undefined : { scale, y }}
      transition={collapse ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}