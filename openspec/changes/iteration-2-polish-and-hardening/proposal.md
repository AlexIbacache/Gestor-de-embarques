# Proposal

## Why

La iteración 1 dejó una base funcional, pero la revisión detectó brechas de pulido y endurecimiento: identidad visual genérica sin modo oscuro operativo (la paleta `.dark` existe pero ningún ThemeProvider la monta), estados de carga ausentes a nivel de ruta, paginación frágil (`page=999` renderiza vacío), búsqueda sin escaping de caracteres especiales de PostgREST, agregación de gráficos en el cliente (violando el spec `dashboard-charts`), y una base de datos sin CHECK constraints que depende ciegamente de la validación de la aplicación. Es el momento de cerrar estas brechas antes de considerar el sistema terminado, porque cada una es un defecto visible o un riesgo de integridad, no una mejora opcional.

## What Changes

- **Identidad visual logística**: reemplazar la paleta por un esquema orientado a logística (primario azul marino/acero profundo, acento ámbar, neutros pizarra) con tokens oklch, y completar el bloque `.dark` de forma coherente.
- **Modo oscuro funcional**: montar `ThemeProvider` (next-themes, ya instalado) con tema del sistema por defecto, toggle en el header y auditoría de colores de gráficos en ambos temas.
- **Continuidad de fondo**: un único fondo de shell para todo el grupo `(dashboard)`; se eliminan los re-envoltorios `bg-background` por página que hoy producen tres blancos casi iguales pero distintos.
- **Sidebar colapsable**: rail de íconos ↔ expandida en desktop, persistida en `localStorage`; el drawer móvil actual se mantiene.
- **Búsqueda global en todos los breakpoints**: el mobile recibe una superficie de input real (dialog/sheet), no un ícono-enlace.
- **Paginación robusta compartida**: componente único con páginas numeradas y elipsis, selector de tamaño (10/25/50 vía `pageSize`) y normalización server-side de `page` fuera de rango (redirect a la última página válida).
- **Clientes**: nuevo filtro por rango de fecha de creación (`from`/`to`). _Supuesto: la revisión lo solicitó como mejora de filtrado; se asume aprobado al ser funcionalidad aditiva sin romper contratos existentes._
- **Embarques**: encabezados de ordenamiento clicables (el servidor ya soporta `?sort=`; hoy los headers son inertes) en paridad con clientes.
- **Eliminación de clientes en el spec**: la UI ya la implementa; se agrega el requisito faltante con confirmación y guarda de FK (cliente con embarques → error amable).
- **Estados de carga de ruta**: `loading.tsx` para dashboard, clientes, embarques y detalle de embarque, reutilizando los skeletons existentes.
- **Feedback consistente**: logout con estado pendiente + toast; la edición usa el diálogo de formulario como superficie de confirmación explícita (sin modal extra).
- **Gráficos legibles**: sin etiquetas truncadas en viewports reducidos; colores auditados para tema oscuro.
- **Errores del dashboard seguros**: mensajes en español mapeados, nunca el mensaje crudo de Supabase.
- **Búsqueda literal**: escaping correcto de literales en `.or()` de PostgREST para que caracteres especiales ni rompan la consulta ni alteren su semántica.
- **Redirect post-login**: el login honra `next` validado (solo rutas internas), con fallback a `/dashboard`.
- **Agregación en PostgreSQL**: una función RPC devuelve conteos por estado, modalidad y buckets mensuales; la página consume datos pre-agregados y el timeline renderiza el mes correcto en zonas UTC negativas.
- **Integridad de datos**: CHECK constraints (5 estados, 3 modalidades), límites de longitud, sanidad de fechas, FK documentada, unicidad de referencia — en `schema.sql` y en un script `ALTER` idempotente para bases existentes.
- **Calidad**: eliminación de casts `any`/`as` y del `@ts-expect-error`; corrección de los 6 desfases documentales conocidos.

No hay cambios BREAKING de API ni de rutas. Los constraints de base de datos endurecen la integridad de datos (ver Impact).

## Capabilities

### New Capabilities

- `data-integrity`: garantías de integridad impuestas por la base de datos de forma independiente a la aplicación — dominio de estados/modalidades, límites de texto, sanidad de fechas, integridad referencial y unicidad.
- `ui-feedback`: estados de carga a nivel de ruta con skeletons y consistencia del feedback de operaciones de escritura (pendiente, toast, confirmaciones).

### Modified Capabilities

- `auth`: el login redirige al destino `next` validado en lugar de ignorarlo.
- `clients`: paginación con tamaño configurable y clamp server-side; búsqueda con caracteres especiales tratada como literal; se agregan eliminación y filtro por fecha de creación.
- `shipments`: paginación con tamaño configurable y clamp server-side; búsqueda literal; encabezados de ordenamiento interactivos (alineación de cumplimiento — el spec ya lo exigía).
- `dashboard`: requisito de layout alineado con la implementación real (exactitud documental); agregación de estadísticas en base de datos; mensajes de error seguros.
- `dashboard-charts`: nuevo requisito de legibilidad de etiquetas en viewports reducidos (no cubierto por el requisito responsive existente).
- `layout`: sidebar colapsable persistida, búsqueda global funcional en todos los breakpoints, fondo único del shell.
- `theme-palette`: la paleta de marca pasa a ser el esquema logístico (azul marino/acero, ámbar, pizarra); se agregan selección de tema claro/oscuro/sistema y legibilidad de gráficos en ambos temas.

## Impact

- **Estilos y tema**: `src/app/globals.css` (tokens oklch light/dark), `src/app/layout.tsx` (ThemeProvider), `src/components/layout/*` (sidebar, header, mobile-nav, toggle de tema).
- **Páginas**: `src/app/(dashboard)/layout.tsx` (fondo único), `dashboard/page.tsx`, `clientes/page.tsx`, `embarques/page.tsx`, `embarques/[id]/page.tsx`, nuevos `loading.tsx`, `login` (redirect `next`).
- **Componentes**: paginación compartida nueva; `clientes/*`, `embarques/*` (headers de orden, filtros de fecha); `dashboard/*` (errores, gráficos responsive/dark); skeletons existentes reutilizados.
- **Lib/validaciones**: `src/lib/utils.ts` (escaping PostgREST, fechas), nuevo módulo único de dominio (estados/modalidades), `src/lib/validations/*`, `src/types/database.ts`.
- **Acciones**: `src/app/actions/auth.ts` (`next`), `clientes.ts`, `embarques.ts` (mapeo de errores consistente).
- **Base de datos**: `supabase/schema.sql` actualizado (CHECK constraints, longitudes, sanidad de fechas, función RPC de estadísticas) y nuevo script idempotente `supabase/migrations/20261015_hardening.sql` para bases existentes. Endurecimiento de integridad: los datos válidos existentes no se afectan; datos fuera de dominio (si existieran) deben corregirse antes de validar los constraints — el plan de migración y rollback está en `design.md`.
- **Dependencias**: cero nuevas (next-themes ya está instalado; solo se monta).
- **Fuera de alcance (diferido explícitamente por la revisión, punto 13)**: control de concurrencia, auditoría (audit trail), soft delete, framework de migraciones versionado, CI, observabilidad. También quedan fuera: infraestructura de tests automatizados (no existe runner; la verificación es build + lint + checklist manual por tarea), cambios al modelo de autorización (rol único autenticado) y cualquier dependencia npm nueva.
