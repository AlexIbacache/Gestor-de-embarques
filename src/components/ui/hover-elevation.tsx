"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";

import {
  HOVER_DURATION,
  HOVER_SCALE,
  HOVER_Y,
  MOTION_EASE,
  useCollapseReducedMotion,
} from "@/components/ui/motion";

/**
 * Wrapper que añade una elevación sutil al hacer hover.
 *
 * Los valores (duración, escala, desplazamiento) y el colapso de
 * `prefers-reduced-motion` vienen del sistema de motion compartido en
 * `src/components/ui/motion.tsx`, para que el hover no derive del resto de las
 * animaciones.
 */
export function HoverElevation({
  children,
  className,
  scale = HOVER_SCALE,
  y = HOVER_Y,
}: {
  children: ReactNode;
  className?: string;
  scale?: number;
  y?: number;
}) {
  const collapse = useCollapseReducedMotion();

  return (
    <motion.div
      className={className}
      whileHover={collapse ? undefined : { scale, y }}
      transition={collapse ? { duration: 0 } : { duration: HOVER_DURATION, ease: MOTION_EASE }}
    >
      {children}
    </motion.div>
  );
}
