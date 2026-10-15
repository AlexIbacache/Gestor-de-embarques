# Tasks

## 1. Design Tokens & Global Styles

- [x] 1.1 Add semantic color CSS variables to `src/app/globals.css` (`--color-success`, `--color-warning`, `--color-neutral`, `--color-danger` with oklch values for light/dark) and verify they appear in computed styles
- [x] 1.2 Extend Tailwind theme inline in `globals.css` to map semantic colors to `--color-success` etc. and verify `bg-success`, `text-warning` etc. work in a test component
- [x] 1.3 Update `--radius` scale in `globals.css` if needed for `rounded-2xl`/`rounded-[20px]` defaults and verify `rounded-2xl` renders 16px radius

## 2. Design System Primitive Updates

- [x] 2.1 Modify `src/components/ui/card.tsx`: remove `ring-1 ring-foreground/10`, change base radius to `rounded-2xl`, add `shadow-sm` default; verify existing dashboard cards render without borders, with shadow and larger radius
- [x] 2.2 Modify `src/components/ui/button.tsx`: change base `rounded-lg` to `rounded-xl`, ensure `size="default"` uses `rounded-full`; verify buttons in dashboard have fully rounded corners
- [x] 2.3 Modify `src/components/ui/input.tsx`: change `rounded-lg border border-input` to `rounded-xl border-none bg-gray-100`; verify search input in header renders borderless with gray background
- [x] 2.4 Modify `src/components/ui/badge.tsx`: change base `rounded-4xl` to `rounded-full`; verify status badges render as pills
- [x] 2.5 Create `src/components/ui/hover-elevation.tsx` wrapper component with Framer Motion `whileHover={{ scale: 1.01, y: -2 }}` respecting `useCollapseReducedMotion`; verify it compiles and wraps a test card

## 3. Layout Shell Components

- [x] 3.1 Update `src/components/layout/sidebar.tsx`: change `bg-background` to `bg-white`, change active item styling from `bg-primary/10 before:bg-primary` to `bg-gray-50 text-foreground before:bg-primary` with left indicator; verify sidebar renders white with subtle active state
- [x] 3.2 Update `src/components/layout/header.tsx`: change `bg-background/80` to `bg-white/80`, update `QuickSearch` Input to use new borderless rounded style; verify header renders with transparent/white backdrop and styled search
- [x] 3.3 Update `src/components/layout/mobile-nav.tsx`: align Sheet content styling with updated sidebar (white bg, subtle active); verify mobile drawer matches sidebar visual language

## 4. Dashboard Page - Bento Grid Layout

- [x] 4.1 Restructure `src/app/(dashboard)/dashboard/page.tsx` to use single CSS Grid container with `grid-template-areas` for desktop (3-col), tablet (2-col), mobile (1-col); verify layout matches Bento spec at each breakpoint
- [x] 4.2 Add `max-w-[1600px] mx-auto` wrapper and `gap-6 p-6 md:p-8` to main content area; verify container centers at 1600px and spacing is consistent
- [x] 4.3 Update app shell background in `src/app/(dashboard)/layout.tsx` from `bg-muted/30` to `bg-slate-50`; verify dashboard background is slate-50
- [x] 4.4 Move KPI StatCards into grid area `kpis` (spans 2 columns desktop), timeline chart into `timeline` (spans 2 columns), donut chart into `status` (column 3), bar chart into `modality` (column 3); verify correct spanning at each breakpoint

## 5. StatCard Enhancements

- [x] 5.1 Update `src/components/dashboard/stat-card.tsx`: add `iconColor` prop mapping to semantic tinted backgrounds (lime/amber/red), apply to icon wrapper; verify each KPI shows icon in tinted circle
- [x] 5.2 Wrap `StatCardMotion` (or StatCard) with `HoverElevation` wrapper; verify hover elevation works on KPI cards
- [x] 5.3 Update dashboard page to pass correct `iconColor` for each KPI: Package→lime, Truck→amber, Clock→red; verify colors match semantic mapping

## 6. Chart Component Refactors

- [x] 6.1 Update `src/components/dashboard/shipment-status-chart.tsx`: change Pie to Donut with `innerRadius={60}`, replace COLORS array with semantic color mapping per status (Entregado→lime, En tránsito→amber, Pendiente→slate, Retrasado→red, Cancelado→gray), attenuate grid lines; verify donut renders with inner hole and semantic colors
- [x] 6.2 Update `src/components/dashboard/shipment-modality-chart.tsx`: add `barSize={40}`, `radius={[4,4,0,0]}`, semantic color mapping per modality (FCL→lime, LCL→amber, AIR→blue), attenuate grid lines and axes; verify thick rounded bars with semantic colors
- [x] 6.3 Update `src/components/dashboard/shipment-timeline-chart.tsx`: add `<defs><linearGradient id="timeline-gradient">` with lime-500 stops (opacity ~0.3 → 0), apply `fill="url(#timeline-gradient)"` to Area, keep `type="monotone"`, attenuate grid lines and axes; verify gradient area fill with smooth curve
- [x] 6.4 Wrap each chart Card in `DashboardCharts` with `HoverElevation`; verify chart cards have hover elevation

## 7. Shipment Status Badge Pill Style

- [x] 7.1 Update `src/components/embarques/shipment-status-badge.tsx`: ensure Badge uses `rounded-full` (from primitive update) and semantic background/text colors; verify status badges in recent shipments list render as pills with correct colors

## 8. DashboardCharts Grid Layout Update

- [x] 8.1 Update `src/components/dashboard/dashboard-charts.tsx` to render charts in Bento grid areas (donut + bar stacked in right column on desktop) instead of `lg:grid-cols-2`; verify chart positioning matches Bento spec

## 9. Responsive Verification & Polish

- [x] 9.1 Test mobile (<768px): verify single-column stack, sidebar drawer via hamburger, chart heights ~250px, skeletons/loading states work
- [x] 9.2 Test tablet (768-1023px): verify 2-column grid, KPIs row, timeline full-width, donut/bar stacked, chart heights appropriate
- [x] 9.3 Test desktop (≥1024px): verify 3-column Bento grid, KPIs+timeline span 2, donut+bar span 1, chart heights ~280px, max-width 1600px centering
- [x] 9.4 Test light/dark mode: verify semantic colors have sufficient contrast in both modes, slate-50/white backgrounds work in dark
- [x] 9.5 Test reduced motion: verify `prefers-reduced-motion` disables hover elevations and chart animations
- [x] 9.6 Verify existing data fetching, error states, and skeleton loading still work identically (no business logic changes)

## 10. Integration Verification

- [x] 10.1 Run `pnpm build` and verify no TypeScript or lint errors
- [x] 10.2 Run `pnpm dev` and manually verify full dashboard flow: navigation, data loading, interactions, responsive resize
- [x] 10.3 Verify no regressions on `/clientes`, `/embarques`, `/embarques/[id]` pages (they use shared UI primitives)