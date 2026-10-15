# Spec Delta

## Purpose

Defines the Bento Box modular grid layout system for the dashboard with responsive breakpoints, max-width container constraints, and consistent spacing tokens across all viewport sizes.

## ADDED Requirements

### Requirement: Dashboard uses CSS Grid Bento layout
The dashboard SHALL render its content areas using a CSS Grid layout that organizes modules into a modular Bento Box structure rather than a simple row-based grid.

#### Scenario: Desktop layout (lg breakpoint and above)
- **WHEN** viewport width is 1024px or greater
- **THEN** the dashboard uses a 3-column grid (`grid-cols-3`) with the left 2 columns spanning the KPI row and timeline chart, and the right column stacking the donut and bar charts

#### Scenario: Tablet layout (md breakpoint)
- **WHEN** viewport width is between 768px and 1023px
- **THEN** the dashboard uses a 2-column grid (`grid-cols-2`) with KPIs in a row, timeline chart spanning full width, and donut/bar charts stacked in the second column

#### Scenario: Mobile layout (below md breakpoint)
- **WHEN** viewport width is less than 768px
- **THEN** the dashboard uses a single-column layout (`grid-cols-1`) with all modules stacked vertically

### Requirement: Dashboard container has maximum width constraint
The dashboard content area SHALL be constrained to a maximum width of 1600px and centered horizontally on ultra-wide screens.

#### Scenario: Ultra-wide screen containment
- **WHEN** viewport width exceeds 1600px
- **THEN** the dashboard content remains centered at 1600px max-width with equal margins on both sides

### Requirement: Consistent spacing tokens across breakpoints
The dashboard SHALL use consistent spacing values: `gap-6` (24px) between all grid modules, `p-6` (24px) or `p-8` (32px) padding around the main content area.

#### Scenario: Gap consistency
- **WHEN** any dashboard module renders adjacent to another module
- **THEN** the gap between them is exactly 24px (`gap-6`) regardless of breakpoint

#### Scenario: Padding consistency
- **WHEN** the dashboard content area renders
- **THEN** it has 24px (`p-6`) or 32px (`p-8`) padding on all sides