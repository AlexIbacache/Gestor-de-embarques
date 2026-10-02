# Spec Delta

## Purpose

Defines the semantic color palette for data visualization replacing the gray-scale chart colors with vibrant, meaning-driven colors: lime-500 for success/delivered, amber-500 for in-transit/warning, slate-400 for neutral/pending states.

## ADDED Requirements

### Requirement: Charts use semantic color palette
All dashboard charts SHALL use the defined semantic color palette instead of the previous gray-scale CSS variable palette (`--chart-1` through `--chart-5`).

#### Scenario: Donut chart status colors
- **WHEN** the shipment status donut chart renders
- **THEN** each status segment uses its semantic color: Entregado → lime-500/lime-400, En tránsito → amber-500, Pendiente → slate-400, Retrasado → red-500, Cancelado → gray-500

#### Scenario: Bar chart modality colors
- **WHEN** the shipment modality bar chart renders
- **THEN** each modality bar uses a distinct semantic color from the palette (e.g., FCL → lime-500, LCL → amber-500, AIR → blue-500)

#### Scenario: Area chart gradient uses primary accent
- **WHEN** the shipment timeline area chart renders
- **THEN** the area fill uses a linear gradient with the primary accent color (lime-500) at full opacity fading to transparent at the baseline

### Requirement: App shell background uses slate-50
The application shell background SHALL use `bg-slate-50` (approximately #F4F5F7) to provide subtle contrast against pure white cards.

#### Scenario: App shell background renders
- **WHEN** the dashboard layout renders
- **THEN** the root container has `bg-slate-50` applied

### Requirement: Cards use pure white background
All dashboard cards and elevated surfaces SHALL use `bg-white` (pure #FFFFFF) to create clear separation from the app shell background.

#### Scenario: Card background renders
- **WHEN** any dashboard card renders
- **THEN** its background is `bg-white` with no border

### Requirement: Text hierarchy uses gray-900 and gray-500
Primary text SHALL use `text-gray-900` (approx #111827) and secondary/muted text SHALL use `text-gray-500` (approx #6B7280).

#### Scenario: Primary text renders
- **WHEN** headlines, KPI numbers, or card titles render
- **THEN** they use `text-gray-900` with appropriate font weight

#### Scenario: Secondary text renders
- **WHEN** labels, timestamps, or supporting text render
- **THEN** they use `text-gray-500`