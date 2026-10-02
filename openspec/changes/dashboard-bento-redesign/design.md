# Design

## Context

Current state: The dashboard uses a simple grid layout (`lg:grid-cols-3` for KPIs, `lg:grid-cols-2` for charts) with gray-scale charts, bordered cards (`ring-1 ring-foreground/10`), and a white app background. Components are built with Next.js 15, TypeScript, Tailwind CSS v4, shadcn/ui (Base UI primitives), Recharts, and Framer Motion. Data fetching happens in Server Components via Supabase. The design system uses CSS variables in `globals.css` for colors (--chart-1 through --chart-5, --radius, etc.).

Constraints: No business logic changes, no data model changes, no Supabase query changes. Must reuse existing components and data fetching. Stack is fixed: Next.js, TypeScript, Tailwind, shadcn/ui, Motion.

## Goals / Non-Goals

**Goals:**
- Implement Bento Box CSS Grid layout with 3/2/1 column responsive breakpoints
- Replace gray-scale chart palette with semantic colors (lime-500, amber-500, slate-400, red-500)
- Elevate all cards: remove borders, add soft shadows, increase radius to rounded-2xl/20px
- Convert PieChart to Donut (innerRadius), thicken BarChart bars (barSize=40, radius=[4,4,0,0]), add gradient AreaChart fill
- Update Sidebar to white background with subtle active indicators
- Update Header to transparent/white background with borderless rounded search input
- Update Button, Input, Badge components with rounded-full/rounded-xl defaults
- Add Framer Motion hover micro-interactions on interactive cards
- Add semantic icons with tinted backgrounds in KPI stat cards
- Ensure all changes work within existing Server Component data fetching architecture

**Non-Goals:**
- No changes to data fetching, Supabase queries, or database schema
- No changes to routing, authentication, or middleware
- No new external dependencies
- No changes to non-dashboard pages (clientes, embarques list/detail)
- No changes to shadcn/ui component APIs (only visual defaults)

## Decisions

### 1. CSS Grid Bento Layout via Dashboard Page Restructure
**Decision:** Restructure `src/app/(dashboard)/dashboard/page.tsx` to use a single CSS Grid container with explicit grid-template-areas for each breakpoint, rather than nested grids.

**Rationale:** A single grid container with `grid-template-areas` provides precise control over the Bento layout (KPIs spanning 2 columns, timeline spanning 2, donut/bar stacked in column 3) and clean responsive transitions. Nested grids create alignment issues at breakpoints.

**Alternatives considered:**
- Nested grids (current approach): Simpler but can't achieve the column 3 stacking with column 1-2 spanning
- Flexbox with wrapping: Less precise control over spanning behavior
- CSS Subgrid: Not widely supported enough

### 2. Semantic Color Tokens via CSS Variables
**Decision:** Add new CSS variables in `globals.css` for semantic chart colors (`--color-success`, `--color-warning`, `--color-neutral`, `--color-danger`) and update chart components to use them instead of `--chart-1` through `--chart-5`.

**Rationale:** CSS variables allow centralized color management, work with both Server and Client Components, and integrate with Tailwind's `oklch()` values. Charts can reference `var(--color-success)` directly in Recharts `fill` props.

**Alternatives considered:**
- Hardcode Tailwind classes in chart components: Doesn't work with Recharts fill props which need CSS color values
- Inline style objects: Less maintainable, no design token consistency
- Theme extension in tailwind.config: Tailwind v4 uses CSS-first, variables are the idiomatic approach

### 3. Elevated Card System via Modified shadcn/ui Card Component
**Decision:** Modify `src/components/ui/card.tsx` to remove default border (`ring-1 ring-foreground/10`), increase base radius to `rounded-2xl`, and add `shadow-sm` as default. Individual cards can opt out via className.

**Rationale:** The Card component is used everywhere in the dashboard. Changing its defaults propagates the elevated look consistently without touching every usage. The `ring-1` border is the shadcn/ui v4 default; removing it achieves the "no visible borders" requirement.

**Alternatives considered:**
- Create new `ElevatedCard` component: Would require updating all dashboard imports
- Add `elevated` variant to Card: More explicit but requires changes at every call site
- Utility class composition: Inconsistent, easy to miss

### 4. Chart Component Refactors (Donut, Bar Radius, Area Gradient)
**Decision:** Update each chart component in place:
- `shipment-status-chart.tsx`: Change `Pie` to include `innerRadius={60}`, replace COLORS array with semantic color mapping
- `shipment-modality-chart.tsx`: Add `barSize={40}`, `radius={[4,4,0,0]}`, semantic color mapping
- `shipment-timeline-chart.tsx`: Add `<defs><linearGradient id="timeline-gradient">` with lime-500 stops, apply to Area `fill="url(#timeline-gradient)"`, keep `type="monotone"`

**Rationale:** Each chart is a focused Client Component. In-place updates minimize risk and keep changes localized. Recharts supports all required props natively.

**Alternatives considered:**
- Create a unified ChartWrapper: Over-engineering for three distinct chart types
- Configuration-driven charts: Adds abstraction layer without benefit for three fixed charts

### 5. Sidebar and Header Visual Updates
**Decision:** 
- Sidebar: Change `bg-background` to `bg-white`, change active item from `bg-primary/10 before:bg-primary` to `bg-gray-50 text-foreground before:bg-primary` (subtle gray pill with left indicator)
- Header: Change `bg-background/80 backdrop-blur` to `bg-white/80 backdrop-blur`, update QuickSearch Input to `bg-gray-100 border-none rounded-full`

**Rationale:** Direct component modifications since these are layout-specific components used only in the dashboard shell.

### 6. Button/Input/Badge Default Rounding via cva Variants
**Decision:** Update `buttonVariants` base to `rounded-xl` (from `rounded-lg`), add `rounded-full` as new `size="default"` for buttons; update Input base to `rounded-xl` border-none `bg-gray-100`; update Badge base to `rounded-full`.

**Rationale:** These are the design system primitives. Changing defaults propagates everywhere. The `cva` variant system makes this a single-source-of-truth change.

**Alternatives considered:**
- Per-component className overrides: Defeats the purpose of a design system
- New variants (e.g., `variant="pill"`): Requires adoption at every usage

### 7. KPI StatCard Semantic Icons with Tinted Backgrounds
**Decision:** Update `StatCard` to accept an optional `iconColor` prop (default "primary") that maps to semantic color classes for the icon background: `bg-lime-100 text-lime-600`, `bg-amber-100 text-amber-600`, etc. Icons: Package (lime), Truck (amber), Clock (red).

**Rationale:** The spec requires "iconos semánticos dentro de los KPI cards (que destaquen visualmente con un fondo circular tintado detrás del ícono)". A prop-based approach keeps StatCard reusable while allowing dashboard-specific semantic colors.

### 8. Framer Motion Hover Micro-interactions
**Decision:** Wrap interactive dashboard cards (StatCard, chart cards, recent shipments card) with a `HoverElevation` wrapper component using `whileHover={{ scale: 1.01, y: -2 }}` and `transition={{ duration: 0.2 }}`.

**Rationale:** Framer Motion is already a dependency. A wrapper component keeps motion logic separate from card content and respects `prefers-reduced-motion` via the existing `useCollapseReducedMotion` hook.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| CSS Grid `grid-template-areas` complexity at 3 breakpoints | Test each breakpoint in browser dev tools; use named areas for clarity |
| Recharts gradient fill not rendering in SSR | Define gradient in `<defs>` inside ResponsiveContainer; Recharts handles this client-side |
| Removing Card borders breaks visual separation on some backgrounds | App shell `bg-slate-50` + card `bg-white` + `shadow-sm` provides sufficient contrast; verify in light/dark modes |
| Semantic color CSS variables not picked up by Tailwind | Use `@theme inline { --color-success: var(--success); }` pattern in globals.css for Tailwind integration |
| Framer Motion hydration mismatch on hover animations | Animations only run client-side (`use client`); initial state matches server render (no transform) |
| Dark mode color contrast for semantic colors | Define dark-mode overrides for each semantic color variable in `.dark` block in globals.css |
| Sidebar active state less visible without primary background | Left border indicator (`before:w-0.5 before:bg-primary`) + text color change maintains accessibility |

## Migration Plan

1. **Phase 1 - Design Tokens:** Add semantic color CSS variables to `globals.css`, update Tailwind theme inline
2. **Phase 2 - Layout Primitives:** Update `card.tsx`, `button.tsx`, `input.tsx`, `badge.tsx` defaults
3. **Phase 3 - Shell Components:** Update `sidebar.tsx`, `header.tsx`, `mobile-nav.tsx` visuals
4. **Phase 4 - Dashboard Page:** Restructure `page.tsx` to Bento CSS Grid layout
5. **Phase 5 - StatCard:** Add semantic icon backgrounds, wrap with HoverElevation
6. **Phase 6 - Charts:** Update each chart component (donut, bar radius, area gradient, grid lines)
7. **Phase 7 - Verification:** Visual review at all breakpoints, light/dark mode, reduced motion

**Rollback:** Each phase is a separate commit. Revert individual commits if issues arise. No database migrations needed.

## Open Questions

1. **Exact `innerRadius` value for donut chart:** Spec says "ej. 60px" — final value should be tuned visually during implementation (40-80px range).
2. **Exact gradient opacity stops for area chart:** Spec says "~0.3 fading to transparent" — fine-tune during implementation (0.2-0.4 range).
3. **Hover elevation scale factor:** Spec says `scale: 1.01` — may need `y: -2` or `y: -4` for perception; test with real content.
4. **Sidebar active item exact styling:** "línea a la izquierda, o cambio de color de icono/texto, o un fondo ligeramente gris con bordes muy redondeados" — choose one approach during implementation based on visual balance.
5. **Whether to add `rounded-2xl` to all Card sizes or only default:** Current Card has `size="sm"` variant; decide if elevated look applies to both.