# Design

## Context

See `proposal.md` for motivation. The constraints that shape the approach:

- **Tailwind v4 + shadcn tokens.** `src/app/globals.css` declares `@theme inline` mapping, then `:root` and `.dark` define the token values in `oklch`. Every component already consumes token classes (`bg-primary`, `bg-card`, `text-muted-foreground`, `bg-sidebar`, `--chart-*`, `--success/--warning/--neutral/--danger`). The current accent is lime: `--primary: oklch(0.78 0.18 125)`.
- **Specs pinned to the old palette.** `dashboard-semantic-colors` mandates lime-500/amber-500 status colors, `bg-slate-50` shell, white cards, and gray-900/gray-500 text. `dashboard-chart-styling` names "lime-500" for the timeline gradient. Both must change with the new palette.
- **Motion already exists, unevenly.** `src/components/ui/motion.tsx` holds the tokens plus `FadeIn`/`FadeInTableRow`; `hover-elevation.tsx`, `stat-card-motion.tsx`, and `animated-content.tsx` use them; `globals.css` has a `prefers-reduced-motion` block; `layout` has a generic "Animaciones moderadas" requirement.
- **Dashboard data and charts.** The dashboard runs four count queries with `Promise.all` and renders Recharts-based client components (currently imported eagerly). Pages are `force-dynamic`.
- **Stack.** Next 16 App Router, React 19, Tailwind v4, shadcn on Base UI, `motion` 13, `recharts` 2, `next/font` (Inter).

## Goals / Non-Goals

**Goals:**

- A corporate palette (blue primary, sky accent, white/gray neutrals) applied through the existing tokens in **light and dark** themes.
- Semantic state colors preserved, harmonized with the new palette.
- Chart colors derived from the palette (no hardcoded lime literals).
- Motion applied consistently through the existing token layer, honoring reduced motion, with no layout shift.
- Concrete, verifiable fluidity wins: charts out of the initial dashboard bundle; server data parallel; no animation-induced layout cost.

**Non-Goals:**

- No route, data-model, Server Action, auth, RLS, or middleware changes.
- No new runtime dependencies.
- Not a full performance program (no caching/CDN/observability work); only the bounded wins above.
- No change to the app's Spanish UI copy or its structure/layout.

## Decisions

1. **Retheme by changing token VALUES, not classes.** Keep the shadcn token contract and swap only the `oklch` values in `:root`/`.dark`. Every component inherits the new look centrally. *Alternative:* add a second token layer or rename tokens — rejected (component churn, two sources of truth).
2. **Hue plan.** `--primary` → corporate blue; `--accent`/`--ring`/`--sidebar-accent` → blue/sky family; neutrals → slate/gray; `--success` stays green, `--warning` amber, `--danger` red so state meaning survives. Charts use blue/sky/gray for categorical series and the semantic hues for statuses. *Alternative:* make everything blue — rejected (destroys state semantics and accessibility).
3. **Charts consume a single palette source.** Replace hardcoded lime/amber Tailwind classes in `shipment-status-chart`, `shipment-modality-chart`, and `shipment-timeline-chart` with values derived from one palette map (or the CSS vars), so the modified specs stay truthful. *Alternative:* leave literal classes — rejected (specs name lime-500 explicitly).
4. **Motion stays in `motion.tsx`.** Expose/centralize the tokens and reuse them; add entry animation only where genuinely missing. Do **not** add JS animation on elements that already ship CSS transitions (`dialog.tsx`, `sheet.tsx` use `tw-animate-css` data attributes) — they would fight. Table rows keep opacity-only animation (no transform on `<tr>`).
5. **Defer the charting library.** Render the Recharts components through `next/dynamic` with a `Suspense` fallback that reserves the chart height (~250/280px), so the charting JS leaves the initial `/dashboard` bundle and the fallback matches the chart box (no CLS). *Alternative:* server-render charts — rejected (Recharts is client-only in practice).
6. **Data fetching stays server-side and parallel.** Confirm the dashboard's independent queries run in `Promise.all` (no waterfall) and list pages keep server-side filtering/ordering/pagination (already the case) — guard it rather than rewrite it.
7. **Reduced motion honored by collapsing the transition, not the `initial` state** (keeps SSR/hydration markup identical — the existing rule in `motion.tsx`); the global `@media (prefers-reduced-motion)` block covers CSS-driven animations.

## Risks / Trade-offs

- **[Blue-on-white contrast too low]** → choose a mid/dark blue for text and fills and verify WCAG AA for text-on-brand and text-on-surface in both themes.
- **[Dark theme looks wrong]** → define both themes together and visually check both; the token contract is identical.
- **[Chart color logic drifts]** → centralize the chart palette in one module/record and reference it from all chart components.
- **[Lazy charts flash or shift layout]** → skeleton reserves the exact chart height; charts keep the existing loading/error states.
- **[Performance work becomes unbounded]** → bound to the three spec requirements; record a before/after baseline (build output + a Lighthouse pass) and keep only non-regressing changes.
- **[Spec drift]** → the two MODIFIED delta specs must land in the same change as the code that satisfies them.

## Migration Plan

- One cohesive change: tokens (`globals.css`) → component/chart retheming → motion pass → chart lazy-load + perf checks. Verify with `npx tsc --noEmit`, `pnpm lint`, `pnpm build` (and the responsive/viewport check already used in this project).
- Rollback: revert the palette-laden commit; tokens are centralized so reverting restores the lime theme. No data migration.
- Dark mode is rethemed in the same change; if the product decides dark mode is out of scope, the dark block can be dropped without touching the rest.

## Open Questions

- Exact blue/sky values (or a specific brand hex) can be tuned inside `theme-palette` without changing any spec.
- Whether dark mode is a product requirement or incidental — this design rethemes it either way, so it does not block the plan.
