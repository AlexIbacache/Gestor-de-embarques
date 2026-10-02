# Design

## Context

El dashboard actual (`src/app/(dashboard)/dashboard/page.tsx`) es un Server Component que ejecuta 4 consultas en paralelo (total, en tránsito, retrasados, últimos 5) y renderiza 3 stat cards + una lista. Todo se resuelve en PostgreSQL y el cliente solo recibe el HTML final.

Ver proposal.md para la motivación. Ver specs/ para los requisitos.

## Goals / Non-Goals

**Goals:**
- Agregar 3 gráficos al dashboard: por estado (dona), por modalidad (barras), en el tiempo (área).
- Mantener el patrón SSR: los datos se obtienen en el Server Component.
- Componentes de gráfico reutilizables y responsivos.
- Skeletons y estados de error consistentes con el resto del dashboard.

**Non-Goals:**
- No agregar interactividad compleja (drill-down, zoom, export).
- No crear una librería de gráficos propia.
- No modificar las consultas existentes (stat cards, últimos embarques).
- No agregar un sistema de cache o materialized views (optimización futura).

## Decisions

### 1. Librería de charting: Recharts

**Decisión**: Recharts.

**Racional**:
- Es el estándar de facto con shadcn/ui + Tailwind. La mayoría de los templates de shadcn lo usan.
- No tiene estilos propios: se colorea con Tailwind/CSS variables, consistente con el tema existente.
- SSR-compatible: renderiza en el servidor un placeholder y hidrata en el cliente.
- Soporta React 19 en versiones recientes (^2.15+).

**Alternativas consideradas**:
- *Chart.js + react-chartjs-2*: canvas-based, menos idiomático en React, requiere manejo manual del resize.
- *Tremor*: construido sobre Recharts, pero trae su propio design system que choca con shadcn/ui.
- *Nivo*: D3-based, más pesado, curva de aprendizaje mayor para 3 gráficos simples.

### 2. Obtención de datos: 3 consultas adicionales en paralelo

**Decisión**: agregar 3 consultas al `Promise.all` existente, una por gráfico, trayendo solo la columna necesaria y agregando en JS.

**Racional**:
- Consistente con el patrón actual (consultas paralelas en PostgreSQL).
- El volumen de datos es pequeño: un string corto por fila (`status`, `modality`, `created_at`).
- No requiere crear funciones RPC ni migraciones.
- Las 3 consultas son independientes y se resuelven en paralelo.

**Alternativas consideradas**:
- *RPC (Postgres function)*: una sola round-trip, agregación en la base. Más escalable pero agrega complejidad (crear la función, mantenerla) para un beneficio que no se necesita a este volumen.
- *Una sola query con todas las columnas*: trae datos que no se usan para los gráficos.
- *5 queries de count por estado*: excesivo cuando basta con traer la columna y contar en JS.

**Optimización futura**: si el volumen crece, reemplazar las 3 consultas por un solo RPC que agregue en PostgreSQL.

### 3. Estructura de componentes

**Decisión**: un componente cliente `DashboardCharts` que contiene los 3 gráficos, con datos pasados como props desde el Server Component.

```
DashboardPage (Server Component)
  ├── StatCards (existente)
  ├── DashboardCharts (Client Component, nuevo)
  │   ├── ShipmentStatusChart (dona)
  │   ├── ShipmentModalityChart (barras)
  │   └── ShipmentTimelineChart (área)
  └── RecentShipments (existente)
```

**Racional**:
- Recharts requiere `"use client"` porque usa hooks y estado interno.
- Los datos se obtienen en el servidor y se pasan como props: el cliente no toca Supabase.
- Cada gráfico es un componente independiente para reutilización y testabilidad.

### 4. Layout

**Decisión**: los gráficos se muestran en un grid de 2 columnas en desktop (`lg:`) y 1 columna en mobile, entre las stat cards y la lista de últimos embarques.

**Racional**:
- 3 gráficos en un grid de 2x2 (con uno ocupando 2 columnas o un tercero abajo) es más legible que 3 columnas angostas.
- En mobile se apilan para mantener legibilidad.
- El gráfico de área (temporal) es más ancho por naturaleza: ocupa 2 columnas en desktop.

### 5. Colores

**Decisión**: usar las CSS variables del tema (`chart-1` a `chart-5` o las equivalentes de shadcn) para que los gráficos respeten el tema claro/oscuro.

**Racional**:
- Consistencia visual con el resto de la app.
- Funciona con `next-themes` sin configuración adicional.

### 6. Skeletons y error

**Decisión**: extender el `DashboardSkeleton` existente con placeholders para los gráficos, y manejar el error de la misma forma que las consultas actuales (primer error → Alert con reintentar).

**Racional**:
- Consistencia con el patrón existente.
- El brief pide estados de carga con skeletons, no texto "Cargando...".

## Risks / Trade-offs

- **[Recharts + React 19]**: Recharts 2.x tuvo problemas de compatibilidad con React 19 en versiones tempranas. → Mitigación: usar Recharts ^2.15+ que declara soporte para React 19. Verificar en el build.
- **[Volumen de datos]**: traer todas las filas para agregar en JS no escala a decenas de miles. → Mitigación: aceptable para el alcance actual. Documentado como optimización futura (RPC).
- **[Bundle size]**: Recharts agrega ~50KB gzip al bundle cliente. → Mitigación: aceptable para un dashboard. No es una app móvil.
- **[SSR de Recharts]**: Recharts renderiza un placeholder en el servidor y hidrata en el cliente. → Mitigación: el skeleton ya cubre el estado de carga; el placeholder de Recharts es invisible para el usuario.

## Migration Plan

1. Agregar Recharts a `package.json`.
2. Crear los componentes de gráfico en `src/components/dashboard/`.
3. Modificar `dashboard/page.tsx` para obtener los datos de los gráficos y pasarlos a `DashboardCharts`.
4. Extender `DashboardSkeleton` con placeholders para los gráficos.
5. Verificar build, lint y tsc.

**Rollback**: revertir el commit. No hay migraciones de base de datos ni cambios de API.
