# Spec Delta

## Purpose

Defines enhanced chart visual specifications: donut chart with innerRadius replacing pie chart, bar chart with rounded tops and increased thickness, area chart with gradient fill, and attenuated grid lines across all dashboard charts.

## ADDED Requirements

### Requirement: Status chart uses donut with inner radius
The shipment status chart SHALL render as a donut chart (PieChart with `innerRadius`) rather than a solid pie chart, using the semantic color palette.

#### Scenario: Donut chart renders with inner radius
- **WHEN** the shipment status chart renders
- **THEN** it uses Recharts `Pie` with `innerRadius` > 0 (e.g., 60px) creating a donut appearance
- **THEN** each segment uses semantic colors per `dashboard-semantic-colors` capability

#### Scenario: Donut chart shows labels
- **WHEN** the donut chart renders with data
- **THEN** each segment displays its label and value (e.g., "Entregado: 10")

### Requirement: Modality chart uses thick bars with rounded tops
The shipment modality chart SHALL render bars with increased thickness (`barSize={40}`) and rounded top corners (`radius={[4, 4, 0, 0]}`) using semantic colors.

#### Scenario: Bar chart renders with thick rounded bars
- **WHEN** the shipment modality chart renders
- **THEN** bars have `barSize={40}` and `radius={[4, 4, 0, 0]}`
- **THEN** each bar uses a distinct semantic color per modality

### Requirement: Timeline chart uses gradient area fill
The shipment timeline chart SHALL render an area chart with a linear gradient fill using the primary accent color (lime-500) fading to transparent at the baseline, with `type="monotone"` smoothing.

#### Scenario: Area chart renders with gradient
- **WHEN** the shipment timeline chart renders
- **THEN** the Area component uses a `<defs><linearGradient>` with primary color at top (opacity ~0.3) fading to transparent at bottom
- **THEN** the line uses `type="monotone"` for smooth curves
- **THEN** stroke and fill use the primary semantic color

### Requirement: Chart grid lines are subtle or removed
All dashboard charts SHALL either remove background grid lines entirely or render them as extremely subtle dotted lines in very light gray (`border-gray-100` equivalent).

#### Scenario: Chart grid lines are subtle
- **WHEN** any dashboard chart renders
- **THEN** X and Y axis grid lines are either hidden or rendered as dotted lines in very light gray
- **THEN** axis lines themselves are hidden or minimally visible

### Requirement: Charts adapt to viewport with consistent heights
Charts SHALL maintain appropriate heights per breakpoint: ~280px on desktop, ~250px on tablet, ~250px on mobile.

#### Scenario: Chart height on desktop
- **WHEN** viewport is desktop (lg+)
- **THEN** charts render at approximately 280px height

#### Scenario: Chart height on mobile
- **WHEN** viewport is mobile (< md)
- **THEN** charts render at approximately 250px height