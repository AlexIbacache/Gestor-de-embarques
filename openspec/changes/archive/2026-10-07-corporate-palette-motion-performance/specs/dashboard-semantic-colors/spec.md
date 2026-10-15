# Spec Delta

## MODIFIED Requirements

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
