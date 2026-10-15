# Proposal

## Why

The UI currently uses a lime-green accent on grays that reads as generic and off-brand for an enterprise product. Motion micro-interactions are applied unevenly, and several concrete spots can improve fluidity and response time without changing functionality. We want a coherent corporate identity (blue, sky, white, grays) across light and dark themes, a consistent motion system, and a faster, smoother experience.

## What Changes

- **Corporate palette**: replace the lime accent with a corporate blue primary, a sky accent, and white/gray neutrals in `globals.css` for light and dark themes (background/surface/text/border/ring/sidebar/charts/states).
- **Data and shell retheming**: chart, shell background, card surface, and text-hierarchy colors derive from the new palette, preserving semantics (success, warning, danger) while harmonized with blue.
- **Motion system**: consolidate motion tokens (duration, easing, offset, stagger) and apply them where missing (page content, cards, table rows, dialogs/drawer, hover), honoring `prefers-reduced-motion` and avoiding layout shift.
- **Fluidity and response time**: defer the charting library load (code-splitting) for the initial render, keep data server-side with parallel fetching (no waterfalls), and avoid expensive animated work in dense lists.
- **BREAKING (visual, no API)**: the UI accent and chart colors stop being lime; anything relying on `--primary`/`--chart-*` changes appearance. No route, data-schema, or Server Action changes.

## Capabilities

### New Capabilities

- `theme-palette`: the application's corporate color palette — tokens for light and dark (brand/primary, sky accent, surfaces, text, borders, ring, sidebar, charts, states) and accessible contrast.
- `ui-motion`: the Motion-based animation system — shared tokens, the surfaces where it applies, and reduced-motion support without layout shift.
- `web-performance`: fluidity and response-time requirements — deferred chart loading, server-side data without waterfalls, and motion that does not degrade rendering.

### Modified Capabilities

- `dashboard-semantic-colors`: chart, shell, and text-hierarchy colors stop being the lime/amber palette and derive from `theme-palette`.
- `dashboard-chart-styling`: the area chart gradient uses the new corporate primary (blue) instead of lime-500.
- `dashboard-charts`: the donut/modality/timeline color mandates move from the lime/amber scale to `theme-palette`.

## Impact

- Tokens and styles: `src/app/globals.css`, `src/app/layout.tsx` (font).
- Components: `src/components/layout/*` (sidebar, header, mobile-nav), `src/components/dashboard/*` (stat cards, charts), `src/components/clientes/*`, `src/components/embarques/*`, `src/components/ui/*` (button, card, badge, input, motion, hover-elevation).
- Charts: `src/components/dashboard/shipment-*-chart.tsx` (Recharts) and `dashboard-charts.tsx`.
- No changes to `src/app/actions/*`, `src/lib/supabase/*`, `supabase/*`, routes, or middleware.
- Dependencies: none added/removed; `motion` and `recharts` continue, with lazy loading added for charts.
