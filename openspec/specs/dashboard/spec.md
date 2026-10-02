# dashboard Specification

## Purpose
TBD - created by archiving change add-dashboard-charts. Update Purpose after archive.

## Requirements

### Requirement: Dashboard incluye gráficos de datos relevantes
El dashboard DEBE mostrar los gráficos definidos en la capacidad `dashboard-charts` junto a las stat cards existentes. Los gráficos DEBEN obtenerse en el mismo Server Component que las stat cards.

#### Scenario: Dashboard con gráficos y stat cards
- **WHEN** el usuario navega a `/dashboard`
- **THEN** el sistema muestra las stat cards existentes y los gráficos de datos relevantes en la misma vista
