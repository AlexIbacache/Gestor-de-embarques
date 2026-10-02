# Tasks

## 1. Setup

- [x] 1.1 Agregar Recharts a `package.json` y verificar que `pnpm install` resuelve la dependencia correctamente
- [x] 1.2 Verificar que Recharts es compatible con React 19 ejecutando `pnpm build` y confirmando que no hay errores de tipos

## 2. Capa de datos

- [x] 2.1 Agregar consulta de embarques por estado en `dashboard/page.tsx` (select status, agregar en JS) y verificar que el array resultante tiene los 5 estados con sus conteos
- [x] 2.2 Agregar consulta de embarques por modalidad en `dashboard/page.tsx` (select modality, agregar en JS) y verificar que el array resultante tiene las 3 modalidades con sus conteos
- [x] 2.3 Agregar consulta de embarques por mes en `dashboard/page.tsx` (select created_at, agrupar por mes en JS) y verificar que el array resultante tiene los meses con sus conteos
- [x] 2.4 Integrar las 3 consultas en el `Promise.all` existente y verificar que el dashboard sigue renderizando las stat cards correctamente

## 3. Componentes de gráfico

- [x] 3.1 Crear `ShipmentStatusChart` (gráfico de dona) y verificar que renderiza un segmento por estado con su cantidad
- [x] 3.2 Crear `ShipmentModalityChart` (gráfico de barras) y verificar que renderiza una barra por modalidad con su cantidad
- [x] 3.3 Crear `ShipmentTimelineChart` (gráfico de área) y verificar que renderiza un punto por mes con su volumen
- [x] 3.4 Crear `DashboardCharts` (componente cliente que contiene los 3 gráficos) y verificar que renderiza los 3 gráficos en un grid responsivo

## 4. Integración en el dashboard

- [x] 4.1 Modificar `DashboardContent` para pasar los datos de los gráficos como props a `DashboardCharts` y verificar que los gráficos aparecen entre las stat cards y la lista de últimos embarques
- [x] 4.2 Verificar que el layout es responsivo: 1 columna en mobile, 2 columnas en desktop (lg:)
- [x] 4.3 Verificar que los colores de los gráficos usan las CSS variables del tema y respetan el modo claro/oscuro

## 5. Estados de carga y error

- [x] 5.1 Extender `DashboardSkeleton` con placeholders para los 3 gráficos y verificar que se muestran durante la carga
- [x] 5.2 Verificar que un error en las consultas de gráficos muestra el Alert con opción de reintentar, consistente con el patrón existente

## 6. Verificación final

- [x] 6.1 Ejecutar `pnpm build` y verificar que compila sin errores
- [x] 6.2 Ejecutar `pnpm exec tsc --noEmit` y verificar que no hay errores de tipos
- [x] 6.3 Ejecutar `pnpm lint` y verificar que no hay errores de lint
- [x] 6.4 Verificar en navegador (375px, 768px, 1280px) que los gráficos se renderizan correctamente y el layout es responsivo
