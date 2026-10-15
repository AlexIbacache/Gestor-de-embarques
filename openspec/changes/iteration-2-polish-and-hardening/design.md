# Design

## Context

Aplicación Next.js 16 (App Router) + Supabase con estructura consolidada: `(auth)/login`, `(dashboard)/{dashboard,clientes,embarques,embarques/[id]}`, Server Actions por dominio, componentes shadcn (base-nova), skeletons ya construidos y toasts en create/edit/delete de ambos dominios. La motivación y el alcance están en `proposal.md`; aquí solo se registra lo que condiciona las decisiones:

- La paleta `.dark` existe en `globals.css` pero ningún `ThemeProvider` la monta: es CSS muerto. `next-themes` ya está instalado (lo usa sonner).
- Hay un triple fondo casi-blanco: shell `bg-slate-50` + re-envoltorio `bg-background` en dashboard + `body`: tres superficies distintas mal coordinadas; el resto de vistas renderiza directo sobre el slate del shell.
- Los gráficos del dashboard descargan todas las filas y agregan en cliente, violando el requisito existente de `dashboard-charts` ("Los valores DEBEN calcularse desde la base de datos").
- No hay framework de migraciones ni CLI local de Supabase: `supabase/` contiene solo `schema.sql` y `seed.sql`.
- No existe runner de tests; los scripts disponibles son `dev`, `build`, `start`, `lint`.
- Seguridad por capas (modelo de cuatro capas, se mantiene): UI (controles y confirmaciones), validación de servidor (Zod en Server Actions), autorización (middleware + verificación de sesión + RLS) e integridad de base de datos (constraints). Este cambio refuerza la cuarta capa sin tocar el modelo de autorización de rol único autenticado.

## Goals / Non-Goals

**Goals:**

- Identidad visual logística coherente en light y dark, con modo oscuro operativo y persistente.
- UX consistente: fondo único, sidebar colapsable, búsqueda global usable en mobile, loading de ruta con skeletons, feedback pendiente+toast en toda operación de escritura (incluido logout).
- Tablas robustas: paginación compartida con tamaño configurable, páginas numeradas y clamp server-side; filtros de clientes con rango de fechas; ordenamiento clicable en embarques.
- Backend endurecido: CHECK constraints de dominio, RPC de agregación del dashboard, errores seguros en español, búsqueda con escaping literal, redirect `next` validado.
- Calidad: un único origen de verdad para estados/modalidades, cero casts injustificados, docs alineados con el código.

**Non-Goals:**

- Infraestructura de tests automatizados: no existe runner y la revisión difirió "tests automatizados" a una etapa futura de endurecimiento para producción. La verificación por tarea es `pnpm build` (typecheck), `pnpm lint` y checklist manual explícito.
- Control de concurrencia, audit trail, soft delete, framework de migraciones versionado, CI, observabilidad (punto 13 de la revisión, diferido).
- Nuevas dependencias npm (next-themes ya está instalado).
- Cambios al modelo de autorización: se mantiene el rol único autenticado y las políticas RLS permisivas actuales.
- Modal de confirmación adicional para edición: el diálogo de formulario ya es la superficie de confirmación explícita (ver Decisión 6).

## Decisions

### 1. Paleta logística en tokens oklch (D1)

Tokens propios en `globals.css`: primario azul marino/acero profundo, acento ámbar, neutros pizarra; bloque `.dark` completado con los mismos roles. _Alternativas_: mantener el azul/cielo actual (no transmite identidad logística y el reviewer pidió reevaluar); adoptar un preset de terceros (menos control de contraste y de la coherencia light/dark). oklch por uniformidad perceptual y porque Tailwind 4 CSS-first lo consume nativamente.

### 2. Un solo fondo de shell (D2)

El layout del grupo `(dashboard)` posee el único fondo (token semántico `background`); las páginas no re-envuelven `bg-background` ni hardcodean slate. _Alternativas_: fondo por página (es el bug actual de triple blanco); unificar todo al color de tarjeta (pierde la jerarquía fondo/superficie que hace flotar las cards).

### 3. Dark mode con next-themes (D12)

`ThemeProvider` con `attribute="class"`, `defaultTheme="system"`, `disableTransitionOnChange`; toggle en el header; persistencia nativa de la librería. Auditoría de `chart-colors` para que los gráficos resuelvan desde los tokens del tema activo. _Alternativas_: tema por cookie casero (reinventar sincronización SSR/cliente); solo media query sin toggle (el reviewer pidió evaluación de dark mode con control de usuario). Costo bajo confirmado: la dependencia ya está instalada.

### 4. Sidebar colapsable persistida + búsqueda global omnipresente (D3, D4)

Desktop: rail de íconos ↔ expandida, preferencia en `localStorage`, estado inicial por defecto para no romper SSR (hidratación sin parpadeo). Mobile: el drawer actual se mantiene y la búsqueda se expone en una superficie con input real (dialog/sheet) accesible desde la navegación móvil; el QuickSearch de desktop sigue en el header. _Alternativas_: expand-on-hover (descubribilidad pobre, sin persistencia); command palette ⌘K como única superficie (no descubrible en mobile ni con teclado ausente).

### 5. Paginación compartida con clamp en servidor (D5)

Un componente de paginación para clientes y embarques: páginas numeradas con elipsis, selector de tamaño 10/25/50 (`pageSize` en URL), y si `page` excede el total, el Server Component redirige a la última página válida en lugar de renderizar vacío. _Alternativas_: duplicar la lógica por página (deriva garantizada; hoy ya divergen); infinite scroll (rompe URLs compartibles y el conteo server-side); clamp client-side (el usuario ve un listado vacío antes de la corrección).

### 6. Edición sin modal de confirmación extra (D10)

Las eliminaciones exigen diálogo de confirmación (ya implementado). Las ediciones NO agregan un segundo modal: el diálogo de formulario es una superficie transaccional explícita — el usuario revisa los datos editados y confirma con "Guardar". _Alternativa_: confirmación adicional tras "Guardar" (doble fricción sin riesgo destructivo que justifique; la edición es reversible re-editando).

### 7. Escaping de literales PostgREST (D14)

Utilidad en `lib/utils.ts` que escapa `\` y `"`, envuelve el término en comillas dobles y neutraliza los caracteres restantes de la gramática (`.`, `:`, `,`, `(`, `)`) antes de interpolar en `.or()`. Se aplica en clientes y embarques. _Alternativas_: `textSearch` con tsvector (cambia la semántica a full-text, requiere configuración de idioma español e índices nuevos); columna generada de búsqueda (más infraestructura para el mismo alcance); filtrado en cliente (viola el requisito de consultas eficientes).

### 8. Agregación del dashboard vía RPC security invoker (D16)

Una función SQL `get_dashboard_stats()` con `security invoker` (la RLS sigue aplicando) que devuelve JSON: conteos por estado, conteos por modalidad y buckets mensuales (`date_trunc('month', created_at)`). La página consume el JSON pre-agregado y elimina la descarga completa de filas. Esto cierra la brecha de cumplimiento con el requisito existente de `dashboard-charts`. Los buckets mensuales se etiquetan con la clave `AAAA-MM` de la función y se renderizan parseando como fecha local (ver Decisión 11), corrigiendo el desfase de mes en zonas UTC negativas. _Alternativas_: vistas agregadas (PostgREST las expone como tablas; mismo resultado pero sin encapsular el contrato JSON y con peor control de permisos); agregación cliente actual (viola el spec y transfiere todo el dataset); una consulta `count` por gráfico (N roundtrips en lugar de uno).

### 9. CHECK constraints sobre enums de Postgres (D17)

`CHECK (status IN (...))` y `CHECK (modality IN (...))` con las 5+3 listas canónicas, `char_length` máximo en columnas de texto, sanidad de `eta` (rango operativo amplio, p. ej. 2000-01-01 a 2100-12-31), FK `client_id` con NO ACTION documentada, unicidad de `reference` conservada y auditoría NOT NULL. _Alternativas_: enums de Postgres (agregar un valor exige `ALTER TYPE`, fricción alta para listas que la app ya versiona); triggers (más código para la misma garantía); tablas de referencia (JOIN y seed extra para 5+3 valores cerrados). Entrega doble: `schema.sql` actualizado (instalaciones nuevas) + `supabase/migrations/20261015_hardening.sql` idempotente (bases existentes).

### 10. Módulo único de dominio (D18)

Un módulo (`src/lib/domain/`) exporta los arrays `const` de estados y modalidades; de él derivan las validaciones Zod, los tipos TS, los badges, `chart-colors`, los filtros del dashboard y el seed. _Alternativas_: mantener la duplicación actual (7 lugares que ya divergen); codegen desde la base de datos (no viable: no hay CLI local de Supabase configurado).

### 11. Estrategia de fechas: calendario vs instante (D20)

Las columnas `date` (ETA) son fechas de calendario: se parsean como hora local (`T00:00:00`) y nunca como medianoche UTC. `created_at` es un instante (`timestamptz`). Se corrige el parse del timeline (`AAAA-MM-01` se interpreta como local, no UTC) para que el mes sea correcto en UTC-3. _Alternativas_: tratar `date` como UTC (es el bug actual de mes corrido); migrar ETA a `timestamptz` (pierde la semántica de fecha civil de una ETA logística).

### 12. Tipado sin casts ni supresiones injustificadas (D19)

Se eliminan los casts `as`/manuales mediante `.returns<T>()` y helpers tipados; se tipan los `defs` de Recharts para retirar el `@ts-expect-error`. Regla permanente: ninguna supresión de compilador sin un comentario que demuestre por qué el compilador está equivocado. _Alternativas_: codegen de tipos con Supabase CLI (descartado: no hay config local de Supabase en el repo); mantener casts (errores silenciosos cuando el esquema cambie).

### 13. Commits convencionales por grupo de trabajo (D22)

Acuerdo de trabajo: cada grupo de `tasks.md` aterriza como al menos un commit convencional (`feat`/`fix`/`refactor`/`docs`/`style`), mensaje en imperativo que revele intención, sin atribución de IA. Antes de empezar, el árbol pendiente actual (diálogos de eliminación, chart-colors, README, cambios archivados) se commitea como baseline convencional (tarea 1.1).

## Risks / Trade-offs

- [Sin runner de tests, la verificación depende de build + lint + checklist manual] → Compuertas explícitas por tarea (`pnpm build` para typecheck, `pnpm lint`, comportamiento observable descrito en cada checkbox); registrado como Non-Goal para que la fase apply no invente un runner.
- [Los CHECK constraints pueden fallar en una base existente con datos fuera de dominio] → Script idempotente que crea los constraints como `NOT VALID` y los valida tras verificación, con listado de filas conflictivas en comentarios; `seed.sql` auditado contra las listas canónicas; rollback documentado (`DROP CONSTRAINT` / `DROP FUNCTION`).
- [Una RPC mal definida podría eludir RLS] → `security invoker` explícito; verificación manual con sesión real confirmando que usuarios autenticados ven solo lo que RLS permite.
- [Contraste insuficiente de la nueva paleta en algún tema] → Verificación WCAG AA durante la implementación (grupo 2); el ajuste fino de hue queda como Open Question.
- [Colores de gráficos hardcodeados se degradan en dark] → `chart-colors` deriva de los tokens CSS del tema activo; auditoría visual en ambos temas como paso del grupo 2.
- [`next` mal validado habilita open redirects] → Validación sintáctica estricta (debe comenzar con `/` y no con `//`), fallback `/dashboard`; escenarios normativos en el delta de `auth`.
- [Escaping incorrecto rompe búsquedas legítimas] → Escenarios de caracteres especiales en los specs de `clients` y `shipments`; checklist manual con matriz de caracteres (`"`, `\`, `,`, `.`, `:`, `(`, `)`, `%`, `*`).
- [La preferencia de sidebar en `localStorage` puede parpadear en SSR] → Render inicial con valor por defecto + aplicación tras hidratación; verificación visual de ausencia de flash.
- [Trade-off asumido] Endurecer constraints es un cambio de integridad, no de API: datos válidos existentes no se afectan; el costo es un paso operativo manual (aplicar el script) documentado en el plan de migración.

## Migration Plan

1. **Bases nuevas**: `supabase/schema.sql` queda actualizado con constraints y la función RPC; una instalación nueva no requiere pasos extra.
2. **Bases existentes**: ejecutar `supabase/migrations/20261015_hardening.sql` en el editor SQL de Supabase. El script es idempotente (re-ejecutable sin errores): crea constraints como `NOT VALID`, expone las filas conflictivas si las hubiera, y valida (`VALIDATE CONSTRAINT`) cuando los datos cumplen.
3. **Seed**: validar `supabase/seed.sql` contra las listas canónicas antes de sembrar (el seed ya usa los 5 estados y 3 modalidades correctos).
4. **Rollback**: `DROP CONSTRAINT` por nombre en `shipments`/`clients` y `DROP FUNCTION get_dashboard_stats()`; ambos comandos documentados en los comentarios del propio script. La RPC y los constraints son aditivos: retirarlos no rompe la app (la página volvería a fallar su consulta, por lo que el rollback de la RPC implica revertir también el commit del consumo, commit separado por diseño).

## Open Questions

- Ajuste fino de hue/chroma de la paleta logística contra ratios de contraste reales durante la implementación (los tokens pueden moverse en chroma sin invalidar la Decisión 1).
- Redacción final de los mensajes de error del dashboard para que coincidan tono a tono con el mapa de códigos PG ya usado en las actions.
