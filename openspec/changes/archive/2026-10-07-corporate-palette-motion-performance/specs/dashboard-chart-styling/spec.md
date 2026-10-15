# Spec Delta

## MODIFIED Requirements

### Requirement: Timeline chart uses gradient area fill
The shipment timeline chart SHALL render an area chart with a linear gradient fill using the corporate primary color (blue, from `theme-palette`) fading to transparent at the baseline, with `type="monotone"` smoothing.

#### Scenario: Area chart renders with gradient
- **WHEN** the shipment timeline chart renders
- **THEN** the Area component uses a `<defs><linearGradient>` with the corporate primary color at top (opacity ~0.3) fading to transparent at bottom
- **THEN** the line uses `type="monotone"` for smooth curves
- **THEN** stroke and fill use the primary semantic color
