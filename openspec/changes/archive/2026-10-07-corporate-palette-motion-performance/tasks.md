# Tasks

## 1. Corporate palette tokens (theme-palette)

- [x] 1.1 Define the corporate palette values in the light theme (`:root` in `src/app/globals.css`): blue primary, sky accent, white/gray neutrals, harmonized `--success/--warning/--danger/--neutral`, sidebar, and chart vars, keeping the existing token names. Verify no brand token still holds a lime value (`rg -n "0\\.78 0\\.18 125" src/app/globals.css` returns only intended leftovers) and `pnpm build` succeeds.
- [x] 1.2 Mirror the same color roles in the `.dark` block with adjusted values. Verify both themes resolve every role (background, card, popover, primary, accent, muted, border, ring, sidebar, chart, states) and `pnpm build` succeeds.
- [x] 1.3 Verify contrast in both themes: text/icons over primary, accent, and each state color meet WCAG AA. Record the measured ratios for the key pairs.

## 2. Component and chart retheming (theme-palette + dashboard-semantic-colors + dashboard-chart-styling)

- [x] 2.1 Replace hardcoded lime/amber brand classes across `src/components/layout/*`, `src/components/ui/*`, and `src/components/dashboard/*` with token classes. Verify `rg -n "lime-|amber-"` under `src/` returns only intended semantic uses and `pnpm lint` passes.
- [x] 2.2 Centralize the chart color map in one module and retarget `shipment-status-chart.tsx`, `shipment-modality-chart.tsx`, and `shipment-timeline-chart.tsx` to it (blue/sky/gray categorical + semantic status hues, gradient on the corporate primary). Verify the three charts render the new colors on `/dashboard` and `npx tsc --noEmit` passes.
- [x] 2.3 Retheme the shell and card surfaces and the text hierarchy on the new palette while keeping the existing slate-50 shell / white-card / gray-text semantics. Verify the dashboard, `/clientes`, and `/embarques` render correctly at 375/768/1280 in light and dark, and `pnpm build` succeeds.
- [x] 2.4 Update the color documentation (`assets/APRENDER_LA_APLICACION.md` token section, and `README.md` if it references the old accent) to describe the corporate palette. Verify the documented token names match `globals.css`.

## 3. Motion system (ui-motion)

- [x] 3.1 Consolidate and export the motion tokens in `src/components/ui/motion.tsx` and reuse them from `hover-elevation.tsx`, `stat-card-motion.tsx`, and `animated-content.tsx`. Verify no duplicated magic duration/easing numbers remain in those files and `pnpm lint` passes.
- [x] 3.2 Apply entry animation where it is genuinely missing (page content, cards, rows) and do NOT add JS animation to elements that already ship CSS transitions (`dialog.tsx`, `sheet.tsx`). Verify there is no double animation on dialogs/drawer and no visual regression.
- [x] 3.3 Verify reduced motion: with `prefers-reduced-motion: reduce`, animations collapse to zero duration and content appears in its final state; record the check.
- [x] 3.4 Update the motion documentation if it describes durations/tokens (same docs as 2.4). Verify the documented motion rules match `motion.tsx`.

## 4. Fluidity and response time (web-performance)

- [x] 4.1 Lazy-load the chart components with `next/dynamic` and a height-reserving skeleton fallback. Verify the initial `/dashboard` response does not include the charting chunk (inspect the build output) and the fallback matches the chart box (no CLS).
- [x] 4.2 Confirm the dashboard's independent queries run in `Promise.all` with no serial waterfall, and list pages keep server-side filtering/ordering/pagination. Verify by reading the queries and, where observable, request timing.
- [x] 4.3 Verify list interaction: changing a filter, ordering, or page updates the list without blocking the UI and preserves typed input, and rows animate without transform/reflow.

## 5. Integration verification

- [x] 5.1 Run `pnpm build`, `npx tsc --noEmit`, and `pnpm lint`; confirm all pass.
- [x] 5.2 Verify the palette end-to-end in a real browser (light and dark, 375/768/1280) against the `theme-palette`, `dashboard-semantic-colors`, and `dashboard-chart-styling` specs; record observations and screenshots.
- [x] 5.3 Record a before/after fluidity baseline (build output and a Lighthouse pass) and confirm no regression against the `web-performance` requirements.
