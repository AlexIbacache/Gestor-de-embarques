# Proposal

## Why

The current dashboard uses a flat, expansive layout with gray-scale charts and bordered cards that create visual noise and lack hierarchy. The design needs to adopt a modern "Bento Box" modular grid architecture with vibrant semantic colors, soft shadows, and elevated surfaces to improve data readability, visual hierarchy, and user engagement — all without changing business logic, data models, or database queries.

## What Changes

- **Layout**: Transform from simple grid to CSS Grid-based Bento layout (3-column desktop, 2-column tablet, 1-column mobile) with `max-w-[1600px]` container, `gap-6`, and `p-6`/`p-8` padding
- **Visual Hierarchy**: Establish clear typography scale — KPI numbers at `text-3xl`/`text-4xl` `font-bold`, card titles `text-sm`/`text-base` `font-medium`, labels `text-xs`/`text-sm` with `uppercase tracking-wider`
- **Color System**: Replace gray-scale palette with semantic colors — `bg-slate-50` app background, `bg-white` cards, `text-gray-900` primary text, `text-gray-500` secondary; accent colors: lime-500 (success/delivered), amber-500 (in-transit/delayed), slate-400 (neutral/pending)
- **Cards**: Remove visible borders (`border`, `border-border`), add `shadow-sm`/`shadow-[0_8px_30px_rgb(0,0,0,0.04)]`, increase radius to `rounded-2xl`/`rounded-[20px]`
- **Charts**:
  - Donut chart (was Pie): add `innerRadius`, use vibrant semantic palette
  - Bar chart: increase `barSize={40}`, add `radius={[4,4,0,0]}`, use semantic colors
  - Area chart: add `<linearGradient>` fill with primary accent fading to transparent, `type="monotone"`
  - Remove/attenuate grid lines to subtle dotted gray
- **Sidebar**: White background, lighter styling, subtle active indicators (left border or color change), no dark gray active background
- **Header**: Transparent/white background, centered search with `rounded-full`/`rounded-xl`, `bg-gray-100` no border
- **Inputs**: Remove rigid borders, `bg-gray-100`, `border-none`, `rounded-full`/`rounded-xl`
- **Buttons**: `rounded-full`/`rounded-xl` default
- **Badges/Status**: Pill style `rounded-full`, tinted background (10% opacity), primary color text
- **Animations**: Subtle hover elevation/scale on cards using Framer Motion (`whileHover={{ scale: 1.01 }}`)
- **Icons**: Semantic icons in KPI cards with tinted circular backgrounds
- **Responsive**: Mobile drawer (Sheet) for sidebar, single-column stack, reduced chart heights
- **Non-goals**: No business logic changes, no data model changes, no Supabase query changes, no routing changes

## Capabilities

### New Capabilities

- `dashboard-bento-layout`: Bento Box modular grid layout system for dashboard with responsive breakpoints (mobile/tablet/desktop), max-width container, consistent gap/padding tokens
- `dashboard-semantic-colors`: Semantic color palette for data visualization (lime-500 success, amber-500 warning/in-transit, slate-400 neutral) replacing gray-scale chart colors
- `dashboard-elevated-cards`: Elevated card system with soft shadows, increased border radius (rounded-2xl/20px), no visible borders, hover micro-interactions
- `dashboard-chart-styling`: Enhanced chart visual specifications — donut with innerRadius, bars with rounded tops and increased thickness, area with gradient fill, subtle grid lines

### Modified Capabilities

- `dashboard`: Layout structure changes from simple grid to Bento grid; stat cards gain semantic icons with tinted backgrounds; charts reference new styling requirements
- `dashboard-charts`: Visual specifications updated — Pie→Donut with innerRadius, Bar chart radius/thickness/colors, Area chart gradient fill, grid line attenuation; responsive behavior refined

## Impact

- **Components modified**: `src/app/(dashboard)/layout.tsx` (app shell background), `src/app/(dashboard)/dashboard/page.tsx` (Bento grid layout), `src/components/dashboard/stat-card.tsx` (semantic icons, elevated card), `src/components/dashboard/dashboard-charts.tsx` (3-column grid layout), `src/components/dashboard/shipment-status-chart.tsx` (donut, colors), `src/components/dashboard/shipment-modality-chart.tsx` (bar radius, colors), `src/components/dashboard/shipment-timeline-chart.tsx` (area gradient), `src/components/layout/sidebar.tsx` (white bg, subtle active), `src/components/layout/header.tsx` (transparent bg, styled search), `src/components/layout/mobile-nav.tsx` (consistency), `src/components/ui/card.tsx` (elevated defaults), `src/components/ui/button.tsx` (rounded defaults), `src/components/ui/input.tsx` (borderless, rounded), `src/components/ui/badge.tsx` (pill variant), `src/components/embarques/shipment-status-badge.tsx` (pill style), `src/app/globals.css` (color tokens, chart CSS variables)
- **Dependencies**: No new dependencies — uses existing `recharts`, `framer-motion`, `shadcn/ui`, `tailwindcss`, `lucide-react`
- **Testing**: Visual regression tests recommended; existing data fetching tests unchanged
- **Migration**: Purely visual — no data migration, no breaking API changes