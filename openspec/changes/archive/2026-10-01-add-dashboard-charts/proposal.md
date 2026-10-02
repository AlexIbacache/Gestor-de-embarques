# Proposal

## Why

El dashboard actual es funcional pero visualmente plano: tres stat cards y una lista de últimos embarques. No aprovecha los datos ya presentes en la base (distribución por estado, mix de modalidad, tendencia temporal) para dar al usuario una visión operativa de un vistazo. Agregar gráficos mejora tanto la estética como la capacidad de interpretación sin cambiar el alcance de la aplicación.

## What Changes

- Agregar gráficos al dashboard que visualicen datos relevantes de la operación:
  - **Embarques por estado** (gráfico de dona): Pendiente, En tránsito, Entregado, Retrasado, Cancelado.
  - **Embarques por modalidad** (gráfico de barras): FCL, LCL, AIR.
  - **Embarques en el tiempo** (gráfico de área): volumen mensual de embarques creados.
- Nuevos componentes de gráfico reutilizables, construidos sobre una librería de charting.
- Nuevas consultas de agregación al servidor para alimentar los gráficos.
- Ajuste del layout del dashboard para acomodar los gráficos junto a las stat cards existentes.
- Responsive: los gráficos se apilan en mobile y se distribuyen en grid en desktop.

## Capabilities

### New Capabilities

- `dashboard-charts`: visualización de datos operativos del dashboard mediante gráficos interactivos.

### Modified Capabilities

- `dashboard`: se agrega el requisito de mostrar gráficos de datos relevantes junto a las stat cards existentes.

## Impact

- **Código**: nuevos componentes en `src/components/dashboard/`, nuevas consultas en `src/app/(dashboard)/dashboard/page.tsx`.
- **Dependencias**: se agrega una librería de charting (Recharts).
- **Layout**: el dashboard pasa de una columna de stat cards + lista a un grid que incluye los gráficos.
- **Performance**: las agregaciones se resuelven en PostgreSQL (group by), no en el cliente.
- **SSR**: los datos de los gráficos se obtienen en el Server Component, consistente con el patrón actual.
