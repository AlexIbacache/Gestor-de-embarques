# dashboard-semantic-colors Specification

## Purpose
Defines the corporate semantic color palette for data visualization: meaning-driven hues sourced from `theme-palette` — success green for delivered, sky accent for in-transit, neutral slate/gray for pending — harmonized with the corporate blue identity.

## Requirements

### Requirement: Charts use semantic color palette
All dashboard charts SHALL use the semantic color palette defined by the `theme-palette` capability instead of a fixed lime-based palette, keeping meaning-driven hues harmonized with the corporate blue identity.

#### Scenario: Donut chart status colors
- **WHEN** the shipment status donut chart renders
- **THEN** each status segment uses its semantic color from `theme-palette`: Entregado → success (green), En tránsito → accent (sky), Pendiente → neutral (slate/gray), Retrasado → danger (red), Cancelado → muted gray

#### Scenario: Bar chart modality colors
- **WHEN** the shipment modality bar chart renders
- **THEN** each modality bar uses a distinct color from the corporate data palette (e.g., FCL → primary blue, LCL → sky accent, AIR → neutral gray)

#### Scenario: Area chart gradient uses primary accent
- **WHEN** the shipment timeline area chart renders
- **THEN** the area fill uses a linear gradient with the corporate primary color (blue) fading to transparent at the baseline

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
