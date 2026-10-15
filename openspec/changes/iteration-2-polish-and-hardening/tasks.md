# Tasks

## 1. Baseline y fundamentos de dominio

- [x] 1.1 Commitear el árbol de trabajo pendiente (diálogos de eliminación ya implementados, `chart-colors.ts`, README, cambios archivados) como commits convencionales separados por intención; verificar con `git log --oneline -5` que cada commit usa tipo convencional en imperativo y con `git status` que el árbol queda limpio
- [x] 1.2 Crear el módulo único de dominio `src/lib/domain/shipments.ts` exportando los arrays `const` de estados (5) y modalidades (3); refactorizar `src/lib/validations/shipment.ts`, `src/types/database.ts`, `shipment-status-badge.tsx`, `chart-colors.ts` y los filtros `.eq()` de `dashboard/page.tsx` para importar desde ahí; verificar con `pnpm build` y con búsqueda `rg "Pendiente.*En tránsito" src/` que solo el módulo de dominio y el seed definen las listas
- [x] 1.3 Alinear `supabase/seed.sql` con el módulo de dominio (comentario que referencia la fuente canónica, valores idénticos); verificar ejecutando schema + seed en la base de desarrollo sin errores
- [x] 1.4 Documentar la estrategia de fechas en `src/lib/utils.ts` (`date` = fecha de calendario con parse local `T00:00:00`, `created_at` = instante) y corregir el parse del timeline en `shipment-timeline-chart.tsx` para que `AAAA-MM-01` se interprete como fecha local; verificar con `pnpm build` y manualmente (zona UTC-3) que el bucket "2026-10" renderiza octubre, no septiembre
- [x] 1.5 Commit del grupo como `refactor(domain): ...`; verificar `git log -1 --oneline` y árbol limpio

## 2. Identidad visual y modo oscuro

- [x] 2.1 Reemplazar los tokens light en `src/app/globals.css` por la paleta logística oklch (primario azul marino/acero, acento ámbar, neutros pizarra, roles de estado armonizados); verificar con `pnpm dev` que botones primarios, enlaces activos y focos usan el nuevo primario
- [x] 2.2 Completar el bloque `.dark` con los mismos roles (fondo, superficie, texto, borde, ring, sidebar, charts, estados) en valores coherentes con la paleta; verificar alternando la clase `dark` en DevTools que ningún rol queda sin definir
- [x] 2.3 Montar `ThemeProvider` de next-themes en `src/app/layout.tsx` (`attribute="class"`, `defaultTheme="system"`, `disableTransitionOnChange`) y agregar el toggle claro/oscuro en el header; verificar que el tema sigue al sistema por defecto, que el toggle cambia el tema y que la elección persiste tras recargar
- [x] 2.4 Unificar el fondo: el layout de `(dashboard)` define el único fondo con el token semántico y se eliminan los re-envoltorios `bg-background` de `dashboard/page.tsx`; verificar visualmente que dashboard, clientes, embarques y detalle comparten exactamente el mismo fondo en light y en dark
- [x] 2.5 Auditar `chart-colors.ts` y los tres gráficos para que resuelvan colores desde los tokens del tema activo; verificar legibilidad de dona, barras y área en ambos temas
- [x] 2.6 Verificar contraste WCAG AA (texto sobre primario, acento y estados) en ambos temas con las herramientas del navegador; commit del grupo como `feat(theme): ...` y verificar `git log -1 --oneline`

## 3. Estados de carga y consistencia de feedback

- [x] 3.1 Crear `src/app/(dashboard)/dashboard/loading.tsx` reutilizando el skeleton del dashboard; verificar navegando a `/dashboard` que la ruta muestra skeletons durante la carga (throttling de red en DevTools)
- [x] 3.2 Crear `src/app/(dashboard)/clientes/loading.tsx` reutilizando `ClientsSkeleton`; verificar igual que 3.1 en `/clientes`
- [x] 3.3 Crear `src/app/(dashboard)/embarques/loading.tsx` reutilizando `ShipmentsSkeleton`; verificar igual que 3.1 en `/embarques`
- [x] 3.4 Crear `src/app/(dashboard)/embarques/[id]/loading.tsx` con skeleton del detalle; verificar igual que 3.1 en un detalle válido
- [x] 3.5 Agregar estado pendiente + toast al logout en `sidebar.tsx` (reemplazar el `void logoutAction()`); verificar que al cerrar sesión el botón muestra estado de progreso, no permite doble clic y aparece toast de confirmación
- [x] 3.6 Pasada de consistencia: toda operación de escritura (crear/editar/eliminar cliente y embarque, login, logout) tiene estado pendiente + toast de éxito/error, y la edición confirma desde el propio diálogo de formulario sin modal extra; verificar manualmente los 7 flujos y documentar el criterio de edición en el README; commit del grupo como `feat(feedback): ...`

## 4. Tablas: paginación, filtros y ordenamiento

- [x] 4.1 Crear el componente compartido de paginación (`src/components/ui/pagination-data.tsx` o similar) con páginas numeradas, elipsis cuando hay más de ~7 páginas, anterior/siguiente y selector de tamaño 10/25/50; verificar renderizándolo con datos de prueba que la numeración y la elipsis son correctas en 1, 5 y 40 páginas
- [x] 4.2 Implementar el clamp server-side: si `page` parseado excede el total de páginas, redirigir a la última página válida; verificar en `/clientes?page=999` que la URL y el listado terminan en la última página en lugar de renderizar vacío
- [x] 4.3 Integrar el componente en `/clientes` reemplazando la paginación anterior y respetando `pageSize` en la query Supabase; verificar que `?pageSize=25` lista 25 registros y que cambiar el tamaño vuelve a `page=1`
- [x] 4.4 Integrar el componente y el clamp en `/embarques` con las mismas verificaciones que 4.2 y 4.3
- [x] 4.5 Agregar el filtro por rango de fecha de creación en clientes (`from`/`to` en URL, formato AAAA-MM-DD, combinado con búsqueda/orden/paginación); verificar que `?from=2026-01-01&to=2026-06-30` filtra correctamente y que los parámetros sobreviven al paginar y ordenar
- [x] 4.6 Convertir los encabezados inertes de la tabla de embarques en enlaces de ordenamiento (referencia, cliente, origen, destino, estado, ETA, fecha de creación) con indicador visual de campo y dirección activos; verificar paridad de comportamiento con clientes (`?sort=<campo>&order=<asc|desc>`) y retirar el comentario que admitía la limitación
- [x] 4.7 Verificación del grupo: `pnpm build` y `pnpm lint` limpios; recorrido manual de paginación/tamaño/clamp/filtro/orden en ambos listados; commit como `feat(tables): ...`

## 5. Layout y responsive

- [x] 5.1 Hacer la sidebar de desktop colapsable (rail de íconos ↔ expandida) con preferencia persistida en `localStorage` y sin flash en la carga inicial; verificar que el estado sobrevive a la recarga y que el rail muestra tooltips/etiquetas accesibles
- [x] 5.2 Exponer la búsqueda global en mobile con una superficie de input real (dialog/sheet) accionada desde la navegación móvil, reemplazando el ícono-enlace actual; verificar en viewport < 768px que se puede escribir un término y navegar a `/embarques?search=<término>`
- [x] 5.3 Ajustar los tres gráficos para que las etiquetas y ticks no se trunquen en anchos reducidos (densidad de ticks, altura mínima, estrategia de etiquetas); verificar a 360px, 768px y 1280px que ninguna etiqueta queda cortada ni superpuesta
- [x] 5.4 Verificación del grupo en los tres breakpoints (sidebar, búsqueda, gráficos, ausencia de overflow horizontal); commit como `feat(layout): ...` y `git log -1 --oneline`

## 6. Endurecimiento del backend

- [x] 6.1 Actualizar `supabase/schema.sql`: `CHECK` de `shipments.status` (5 valores canónicos), `CHECK` de `shipments.modality` (FCL/LCL/AIR), límites `char_length` en columnas de texto de `clients` y `shipments`, sanidad de `shipments.eta` (rango operativo amplio), comentario que documenta la FK `client_id` con NO ACTION y la auditoría NOT NULL; verificar ejecutando el schema completo en una base limpia sin errores
- [x] 6.2 Crear `supabase/migrations/20261015_hardening.sql` idempotente para bases existentes (constraints `NOT VALID` + `VALIDATE CONSTRAINT`, comentarios con el listado de verificación de filas conflictivas y los comandos de rollback); verificar ejecutándolo dos veces seguidas sobre la base de desarrollo sin errores
- [x] 6.3 Validar `supabase/seed.sql` contra los nuevos constraints; verificar que el seed se aplica completo tras los constraints en una base limpia
- [x] 6.4 Crear la función `get_dashboard_stats()` (`security invoker`, lenguaje sql/plpgsql) que devuelve JSON con conteos por estado, conteos por modalidad y buckets mensuales `AAAA-MM`; incluirla en `schema.sql` y en el script de migración; verificar llamándola desde el editor SQL con un usuario autenticado y comparando los conteos contra `select status, count(*) ... group by`
- [x] 6.5 Reescribir la obtención de datos en `dashboard/page.tsx` para consumir la RPC (un solo llamado) y eliminar las descargas completas de filas y la agregación en cliente de los tres gráficos; verificar en la pestaña Network que ya no se transfieren filas crudas y que los gráficos muestran los mismos totales
- [x] 6.6 Reemplazar el render del mensaje crudo de Supabase en el dashboard por mensajes en español mapeados, consistentes con el mapa de códigos PG de las actions; verificar forzando un error (p. ej. función ausente) que la UI muestra el mensaje seguro con opción de reintentar y nunca el texto técnico
- [x] 6.7 Crear la utilidad de escaping de literales PostgREST en `src/lib/utils.ts` (escapar `\` y `"`, envolver en comillas, neutralizar `.` `:` `,` `(` `)` restantes) y aplicarla en las consultas `.or()` de clientes y embarques; verificar con la matriz manual de caracteres (`"`, `\`, `,`, `.`, `:`, `(`, `)`, `%`, `*`) que ninguna búsqueda rompe la query ni cambia su semántica
- [x] 6.8 Modificar `loginAction` para honrar `next` validado (debe comenzar con `/` y no con `//`), con fallback `/dashboard`; verificar login con `?next=/embarques` (redirige ahí), con `?next=//evil.com` y `?next=https://evil.com` (caen a `/dashboard`) y sin `next` (va a `/dashboard`)
- [x] 6.9 Verificación del grupo: `pnpm build` y `pnpm lint` limpios, base migrada operativa, dashboard y listados funcionando de punta a punta; commits como `feat(db): ...` y `fix(security): ...` según corresponda

## 7. Calidad de código y exactitud documental

- [x] 7.1 Eliminar los casts `as`/manuales y el `any` mediante `.returns<T>()` y helpers tipados, y retirar el `@ts-expect-error` de `shipment-timeline-chart.tsx` tipando correctamente los `defs` de Recharts; verificar con `pnpm build` que no quedan casts sin justificar (`rg "as [A-Z]|@ts-expect-error" src/`) y que cualquier supresión restante tiene comentario que demuestra por qué el compilador está equivocado
- [x] 7.2 Corregir los desfases documentales conocidos: comentario de agregados de `dashboard/page.tsx` (hoy afirma que todo se agrega en PostgreSQL — tras 6.5 debe ser verdad y el comentario debe reflejarlo), comentario de constraint inexistente en `shipment-status-badge.tsx`, claim "ordenables" del README (verdadero tras 4.6), comentario WU-9 de `shipment-table.tsx` sobre la ruta de detalle, cumplimiento de `dashboard-charts` y consistencia general del README; verificar con `rg` que cada comentario corregido describe el comportamiento real
- [x] 7.3 `pnpm build` y `pnpm lint` limpios; commit del grupo como `refactor(types): ...` y `docs: ...`

## 8. Cierre e integración

- [ ] 8.1 Recorrido manual de integración completo: login con y sin `next`, dashboard (conteos, gráficos, errores, empty states), clientes y embarques (búsqueda con caracteres especiales, filtros, orden, paginación con tamaño y clamp, crear/editar/eliminar con guards), detalle, loading de cada ruta, logout con feedback, sidebar colapsable, búsqueda móvil, ambos temas en los tres breakpoints; verificar que cada ítem del recorrido pasa
- [x] 8.2 Verificación estructural final: `pnpm build` y `pnpm lint` limpios, `openspec validate iteration-2-polish-and-hardening --strict` sin errores
- [x] 8.3 Pasada final de README (features actuales: dark mode, paginación con tamaño, filtros de fecha, constraints de base de datos, RPC del dashboard); verificar que cada afirmación del README se sostiene contra el código
- [x] 8.4 Confirmar el acuerdo de commits convencionales: `git log --oneline` muestra que cada grupo aterrizó como al menos un commit `feat`/`fix`/`refactor`/`docs`/`style` en imperativo, que revela la intención y que ningún commit lleva atribución de IA; commit final `docs: ...` si la pasada de README lo requiere
