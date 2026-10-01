"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/* -------------------------------------------------------------------------- */
/*                              Motion tokens                                  */
/* -------------------------------------------------------------------------- */

/**
 * One source of truth for the app's motion system.
 *
 * `DURATION` / `Y_OFFSET` / `EASE` are the values `AnimatedContent` documents as
 * the project-wide convention (`opacity 0→1`, `y 10→0`, short `easeOut`). The
 * project has no Tailwind `--ease-*` / `--duration-*` tokens in `globals.css`, so
 * this module *is* the scale; changing a value here changes it everywhere.
 */
export const MOTION_DURATION = 0.3;
export const MOTION_Y_OFFSET = 10;
export const MOTION_EASE = "easeOut";

/**
 * Table rows are denser than cards, so they resolve a little faster.
 */
export const ROW_DURATION = 0.25;

/**
 * Per-row stagger, in milliseconds.
 *
 * 25ms per row is roughly the threshold where a cascade still reads as a
 * deliberate cascade rather than as lag. Combined with `ROW_STAGGER_CAP` the
 * *total* added delay for a list of any length is `25 × 4 = 75ms` — the number
 * that actually matters, because a linear `index × 25ms` on a 40-row page would
 * push the last row out by a full second.
 */
export const ROW_STAGGER_MS = 25;

/**
 * How many rows get a progressively later start. Every row past this index
 * shares the final delay instead of pushing further out, so the delay stops
 * growing with the row count.
 */
export const ROW_STAGGER_CAP = 4;

/**
 * The transition used when the user prefers reduced motion.
 *
 * `duration: 0` and no delay means the element snaps straight from its initial
 * to its final state on the first animation frame: no fade, no slide, no wait.
 */
const REDUCED_TRANSITION = { duration: 0 } as const;

/* -------------------------------------------------------------------------- */
/*                                Reduced motion                              */
/* -------------------------------------------------------------------------- */

/**
 * The one place `useReducedMotion` is consulted.
 *
 * `=== true` rather than a truthiness test on purpose: the hook is typed
 * `boolean | null` and returns `null` during server rendering, so `null` has to
 * mean "not reduced" or the server and the browser would disagree.
 */
function useCollapseReducedMotion() {
  return useReducedMotion() === true;
}

/* -------------------------------------------------------------------------- */
/*                                  FadeIn                                    */
/* -------------------------------------------------------------------------- */

export type FadeInProps = {
  children: ReactNode;
  /**
   * Delay in **milliseconds** before the animation starts. Expressed in
   * milliseconds because that is the unit the callers think in ("the third card
   * starts 40ms after the second"); converted to seconds on the way to Motion.
   */
  delay?: number;
  className?: string;
};

/**
 * The stagger step for a list of cards, in milliseconds. Exported so a `.map()`
 * over a list can compute the same capped stagger `FadeInTableRow` uses rather
 * than re-deriving the arithmetic at each call site.
 */
export const CARD_STAGGER_MS = 40;

/**
 * Fade-in + slide-up wrapper. `opacity 0→1`, `y 10→0`, `easeOut` — the same
 * entry `AnimatedContent` uses for page content.
 *
 * `delay` is a plain millisecond value with **no cap of its own**: Motion
 * measures it, so a caller that passed an unbounded value would get an unbounded
 * wait. Lists should clamp with `Math.min(index, cap)` the way
 * `FadeInTableRow` does rather than trusting this component to do it.
 *
 * `initial` is deliberately **not** branched on the reduced-motion preference.
 * Motion serialises `initial` into the server-rendered HTML
 * (`style="opacity:0;transform:translateY(10px)"`, verified against
 * `react-dom/server`), and the server cannot know the visitor's OS setting. If
 * the two renders disagreed about `initial`, a reduced-motion visitor would
 * hydrate a different inline style than the server sent. Keeping `initial`
 * identical on both sides makes the markup provably match, and the preference
 * is honoured by collapsing the *transition* to zero duration instead — the
 * element then never animates at all.
 */
export function FadeIn({ children, delay = 0, className }: FadeInProps) {
  const collapse = useCollapseReducedMotion();

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: MOTION_Y_OFFSET }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        collapse
          ? REDUCED_TRANSITION
          : {
              duration: MOTION_DURATION,
              ease: MOTION_EASE,
              delay: delay / 1000,
            }
      }
    >
      {children}
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              FadeInTableRow                                */
/* -------------------------------------------------------------------------- */

export type FadeInTableRowProps = {
  children: ReactNode;
  /** Zero-based position of this row in the list it belongs to. */
  index: number;
  /** Merged onto the row; pass the same value `TableRow` would receive. */
  className?: string;
};

/**
 * Opacity-only entry for a table row, with a hard-capped stagger.
 *
 * Two deliberate differences from `FadeIn`:
 *
 * 1. **No transform.** Rows animate opacity only. A `<tr>` is a table-layout
 *    box, and giving it a `transform` risks layout/paint differences across
 *    engines and would make the element a containing block for any absolutely
 *    positioned descendant. A pure fade also reads better in a dense list than
 *    a slide, where 40 rows moving at different times is noise rather than
 *    hierarchy.
 * 2. **Capped delay.** `Math.min(index, ROW_STAGGER_CAP) × ROW_STAGGER_MS`, so
 *    the delay saturates at 75ms no matter how many rows there are. The last
 *    row of a 10-row page and the last row of a 400-row page are equally late.
 *
 * Note that `index` only affects *when* a row starts, not *whether* it starts:
 * Motion's `initial` → `animate` runs on mount, and the tables key their rows by
 * `id`. A row that survives a filter/sort/page change keeps its DOM node and
 * therefore never replays, so the cascade cannot re-fire per keystroke — only
 * genuinely new rows animate.
 */
export function FadeInTableRow({
  children,
  index,
  className,
}: FadeInTableRowProps) {
  const collapse = useCollapseReducedMotion();

  const staggerIndex = Math.min(Math.max(index, 0), ROW_STAGGER_CAP);

  return (
    <motion.tr
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={
        collapse
          ? REDUCED_TRANSITION
          : {
              duration: ROW_DURATION,
              ease: MOTION_EASE,
              delay: (staggerIndex * ROW_STAGGER_MS) / 1000,
            }
      }
    >
      {children}
    </motion.tr>
  );
}
