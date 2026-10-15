# Guía para aprender la aplicación: Gestor de Embarques

> Objetivo: entender **cómo está construida**, **dónde se usa cada tecnología del stack** y **por qué se tomaron ciertas decisiones de seguridad y arquitectura**. Pensado para leerlo junto al código fuente.

## Índice

- [1. Visión general](#1-visión-general)
- [2. Principios de arquitectura](#2-principios-de-arquitectura)
- [3. Stack tecnológico: dónde se utiliza cada tecnología](#3-stack-tecnológico-dónde-se-utiliza-cada-tecnología)
- [4. Estructura del proyecto](#4-estructura-del-proyecto)
- [5. Flujo de datos: Server Components + Server Actions](#5-flujo-de-datos-server-components--server-actions)
- [6. Autenticación, Middleware y Defensa en Profundidad](#6-autenticación-middleware-y-defensa-en-profundidad)
- [7. Modelo de datos, RLS y Políticas](#7-modelo-de-datos-rls-y-políticas)
- [8. Validación, Sanitización y Allowlists](#8-validación-sanitización-y-allowlists)
- [9. Manejo de errores y concurrencia](#9-manejo-de-errores-y-concurrencia)
- [10. Estado en URL, Paginación, Filtros y Ordenamiento](#10-estado-en-url-paginación-filtros-y-ordenamiento)
- [11. UI, Componentes y Estilos (Tailwind v4 + shadcn/ui + Base UI)](#11-ui-componentes-y-estilos-tailwind-v4--shadcnui--base-ui)
- [12. Dashboard, Gráficos y Tokens de Color](#12-dashboard-gráficos-y-tokens-de-color)
- [13. Seguridad: Aprendizajes Clave](#13-seguridad-aprendizajes-clave)
- [14. Fechas, Timezones y Datos del Seed](#14-fechas-timezones-y-datos-del-seed)
- [15. Roadmap de aprendizaje (recomendado para leer en orden)](#15-roadmap-de-aprendizaje-recomendado-para-leer-en-orden)
- [16. Trampas conocidas y lecciones a tomar](#16-trampas-conocidas-y-lecciones-a-tomar)

## 1. Visión general

Esta aplicación es un **gestor de embarques logísticos** con:

- **Autenticación** obligatoria (sin registro público). Solo usuarios creados manualmente en Supabase Auth pueden ingresar.
- **CRUD completo** de Clientes y Embarques.
- **Listados server-side**: filtros, ordenamiento, búsqueda y paginación resueltos en el servidor (Server Components).
- **Arquitectura "server-first"**: la base de datos (Postgres + RLS) es la **última línea de defensa**, no la primera.
- **Tres capas de seguridad** aplicadas consistentemente: Middleware → Server Actions → Row Level Security (RLS).

## 2. Principios de arquitectura

| Principio | Explicación | Dónde aplicarlo |
|---|---|---|
| **Server Components por defecto** | Las páginas leen datos directamente en el servidor. Evita exponer lógica de datos al cliente. | `src/app/(dashboard)/**/page.tsx` |
| **"use client" mínimo** | Solo para interactividad (formularios, tablas, filtros, diálogos, selects). | Componentes en `clientes/`, `embarques/`, `ui/` que requieren estado/ eventos |
| **Server Actions para mutaciones** | Toda escritura pasa por acciones del servidor con validación y verificación de sesión. | `src/app/actions/*.ts` |
| **Defensa en profundidad** | Nunca confiar en UI. Cada capa valida por su cuenta. | Middleware + Actions + RLS |
| **Datos como fuente única de verdad** | Constraints, unicidad y permisos se validan también en BD (no solo Zod). | `supabase/schema.sql` + RLS |
| **Estado compartible** | Filtros/orden/paginación viven en **query params** (URL). Permite compartir, refresh y back/forward correctos. | Páginas de listados (`clientes/page.tsx`, `embarques/page.tsx`) |

## 3. Stack tecnológico: dónde se utiliza cada tecnología

| Tecnología | Versión | Uso en la app | Ubicación exacta |
|---|---|---|---|
| **[Next.js](https://nextjs.org/)** (App Router) | 16.3.8 | Rutas, layouts, Server Components, Server Actions, Middleware, `dynamic="force-dynamic"`, routing por carpetas. | `src/app/**`, `src/middleware.ts`, `next.config.ts` |
| **[React](https://react.dev/)** | 19.2.8 | Runtime de componentes. Uso mayoritario en Server Components + Client Components puntuales. | Todo `src/components/**`, páginas con `"use client"` |
| **[TypeScript](https://www.typescriptlang.org/)** | ^5 | Tipado estricto. Tipos derivados de Supabase (`Database`), payloads de Actions, Props. | `src/types/database.ts`, `tsconfig.json`, uso transversal |
| **[Tailwind CSS v4](https://tailwindcss.com/)** | ^4 | Estilos utilitarios. Config vía `@tailwindcss/postcss`. Usa tokens CSS (`var(--color-*)`) y clases semánticas. | `src/app/globals.css`, todos los componentes (`className`) |
| **[shadcn/ui](https://ui.shadcn.com/) (style `base-nova`)** | ^4.21.0 | Sistema de componentes reutilizables sobre Base UI. Componentes accesibles y consistentes. | `src/components/ui/*` (`card.tsx`, `button.tsx`, `input.tsx`, `badge.tsx`, `dialog.tsx`, `select.tsx`, etc.) |
| **[@base-ui/react](https://base-ui.com/)** | ^1.8.0 | Primitive layer (no Radix). Diferencias clave en APIs (ver sección 11). | Importado desde `src/components/ui/*` (p.ej. `@base-ui/react/dialog`, `@base-ui/react/select`) |
| **[@supabase/supabase-js](https://supabase.com/docs/reference/javascript)** | ^2.117.2 | Cliente JS para operaciones. | Usado indirectamente vía SSR clients |
| **[@supabase/ssr](https://supabase.com/docs/guides/auth/server-side/nextjs)** | ^0.12.7 | Clientes SSR con cookies (lectura/escritura segura entre server/client). | `src/lib/supabase/client.ts`, `server.ts`, `middleware.ts` |
| **[Zod](https://zod.dev/)** | ^4.6.5 | Validación de entrada **servidor-side** (FormData → schemas). Nunca confía en cliente. | `src/lib/validations/client.ts`, `shipment.ts`, usado en `src/app/actions/*.ts` |
| **[Motion](https://motion.dev/)** (Framer Motion) | ^13.4.6 | Micro-interacciones: `HoverElevation`, `FadeIn`, animaciones de contenido. Respeta `prefers-reduced-motion`. | `src/components/ui/hover-elevation.tsx`, `src/components/dashboard/stat-card-motion.tsx`, `src/app/(dashboard)/layout.tsx` |
| **[Lucide React](https://lucide.dev/)** | ^1.49.0 | Iconografía consistente. | Usado transversalmente (Sidebar, KPIs, formularios, badges contextuales) |
| **[Sonner](https://sonner.emilkowal.ski/)** | ^2.0.8 | Toasts/notificaciones de resultado (éxito/error) tras mutaciones. | `src/app/layout.tsx` (Toaster), invocado desde Client Components tras Server Actions (p.ej. `clientes/`, `embarques/` forms/dialogs) |

## 4. Estructura del proyecto

```text
src/
├── app/
│   ├── (auth)/login/page.tsx           # Login (Server Component + formulario cliente)
│   ├── (dashboard)/
│   │   ├── layout.tsx                  # Shell autenticado + Motion + bg-slate-50
│   │   ├── dashboard/page.tsx          # Dashboard (RSC) - KPIs + charts + últimos embarques
│   │   ├── clientes/page.tsx           # Listado clientes (RSC) + filtros URL
│   │   └── embarques/
│   │       ├── page.tsx                # Listado embarques (RSC) + filtros complejos
│   │       └── [id]/page.tsx           # Detalle/edición embarque (RSC) + UUID validation
│   ├── actions/
│   │   ├── auth.ts                     # signInAction, signOutAction (Server Actions)
│   │   ├── clientes.ts                 # create/update/delete Client (SA + Zod + sesión)
│   │   └── embarques.ts                # CRUD Embarques (SA + mapeo errores por código)
│   ├── globals.css                    # Tokens CSS (semánticos) + Tailwind v4 theme
│   ├── layout.tsx                      # Root layout + Toaster (Sonner)
│   └── page.tsx                        # Redirect a /dashboard
├── components/
│   ├── auth/login-form.tsx
│   ├── clientes/                       # Client Components (forms, table, filters, dialogs)
│   ├── dashboard/                      # KPIs, charts, stat-card, motion wrappers
│   ├── embarques/                      # Forms, table, badges, filters, dialogs
│   ├── layout/                         # Sidebar, Header, MobileNav
│   └── ui/                             # Primitives shadcn/ui (Base UI)
├── lib/
│   ├── supabase/
│   │   ├── client.ts                   # Browser client (createBrowserClient)
│   │   ├── server.ts                   # Server client (createServerClient + cookies)
│   │   └── middleware.ts               # updateSessionWithUser (refresh + getUser)
│   ├── validations/
│   │   ├── client.ts                   # Schemas Zod clientes
│   │   └── shipment.ts                 # Schemas Zod embarques + allowlists
│   └── utils.ts                        # formatDate, formatDateTime, cn, formatSearchTerm
├── types/
│   └── database.ts                     # Tipos Database generados desde Supabase
└── middleware.ts                       # Middleware Next (matcher + updateSession)
```

`supabase/`
- `schema.sql` – Esquema, índices, FKs, RLS habilitado + políticas (idempotente)
- `seed.sql` – 15 clientes + 40 embarques con fechas relativas (`current_date + make_interval`)

## 5. Flujo de datos: Server Components + Server Actions

### Lectura (Server Components) – patrón server-first

Las páginas de listado **leen directamente con Supabase Server Client** (sin pasar por API routes). Ejemplos:

- **Clientes**: `src/app/(dashboard)/clientes/page.tsx:22–113`
  - Extrae `searchParams` (URL state)
  - Usa `createClient()` server (`lib/supabase/server.ts`)
  - Query con `.select('*', { count: 'exact' })`, `.ilike()`/`.or()` para búsqueda, `.order()` dinámico (con allowlist), `.range()` para paginación
  - Devuelve datos a componentes cliente (tabla + filtros)

- **Embarques**: `src/app/(dashboard)/embarques/page.tsx:63–181`
  - Filtros: `search`, `status`, `modality`, `sort`, `order`, `page`
  - Join con `clients` (`.select('*, client:clients(name,company)')`)
  - Búsqueda OR sobre `reference`, `origin`, `destination`, `clients.name`, `clients.company`
  - Paginación server-side con `range(from, to)`

- **Dashboard**: `src/app/(dashboard)/dashboard/page.tsx:29–115`
  - 4 consultas paralelas (`Promise.all`) para KPIs: totales, `En tránsito`, `Retrasado`, + últimos 5 embarques con join cliente
  - Datos para charts: `statusData`, `modalityData`, `timelineData` (agrupados por día vía SQL/transformación en cliente según necesidad)
  - Renderiza `DashboardCharts` por modo (`status|modality|timeline|all`)

**Clave**: `export const dynamic = "force-dynamic"` en páginas autenticadas (p.ej. `dashboard/page.tsx:20`, `clientes/page.tsx:17`, `embarques/page.tsx:58`, `[id]/page.tsx:22`). Esto asegura que los datos no se cacheen estáticamente cuando dependen de sesión/params dinámicos.

### Mutaciones (Server Actions)

Todas las escrituras viven en `src/app/actions/`. Patrón común:

1. **Crear cliente Supabase server**: `const supabase = await createClient()` (`lib/supabase/server.ts`)
2. **Verificar sesión explícita**: `const { data: { user } } = await supabase.auth.getUser()` (nunca confiar solo en cookies/middleware para mutaciones)
3. **Validar FormData con Zod**: parse → `success/data/error`
4. **Mapear payload explícito**: **solo columnas escribibles** (p.ej. `name,email,company`), **nunca** `id`, `created_at`
5. **Ejecutar operación** (`.insert()`, `.update()`, `.delete()`)
6. **Mapear errores por código** (PostgREST) → mensajes en español (ver Sección 9)
7. **Retornar `ActionResult`** (`{ success: true, ... } | { success: false, error: string }`)
8. **Client Component** consume resultado → muestra `toast` (Sonner) + revalida/ruta (Next re-render vía Server Component)

**Ejemplos:**
- `clientes.ts`: `createClientAction` (l.36–80), `updateClientAction` (l.82–132), `deleteClientAction` (l.134–183)
- `embarques.ts`: `createShipmentAction` (l.44–114), `updateShipmentAction` (l.116–189), `deleteShipmentAction` (l.191–250) – con mapeo detallado de códigos (`23505`, `23503`, `23502/23514`, `42501`, `PGRST116`)
- `auth.ts`: `signInAction` (l.5–39) valida con Zod, usa `signInWithPassword`, redirige con `redirect('/dashboard')` o retorna error

## 6. Autenticación, Middleware y Defensa en Profundidad

La app implementa **3 capas independientes**:

| Capa | Archivo | Propósito | ¿Qué protege? |
|---|---|---|---|
| **1. Middleware (navegación)** | `src/middleware.ts` (root) + `src/lib/supabase/middleware.ts` (`updateSessionWithUser`) | Refresca sesión en requests cubiertos por `matcher`. Redirige no autenticados a `/login`, preservando `?next=`. | Mejora UX/navegación. **No bloquea invocaciones directas** de Server Actions fuera del flujo de navegación. |
| **2. Server Actions (mutaciones)** | `src/app/actions/*.ts` | Verifica `supabase.auth.getUser()` **en cada mutación**. Rechaza si no hay usuario. | Protege escrituras aunque alguien invoque la Action directamente (curl/Postman, replay). |
| **3. RLS (BD)** | `supabase/schema.sql` (políticas) | Postgres aplica políticas por fila/tabla con `auth.uid() is not null`. | **Última barrera**: si JWT inválido/sin sesión llega a PostgREST, ninguna política concede acceso. |

### Middleware en detalle

- **Root**: `src/middleware.ts:4–18` define `matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']` (omite assets estáticos).
- **Lógica**: `await updateSessionWithUser(request)` (`lib/supabase/middleware.ts:6–63`)
  - Crea Supabase server client con cookies (request/response)
  - **`const { data: { user } } = await supabase.auth.getUser()`** (no solo `getSession()`). Esto valida el JWT activamente.
  - Si **no hay user** y la ruta **no** empieza con `/login` → redirige a `/login?next=<pathname+search>`
  - Si **hay user** e intenta ir a `/login` → redirige a `/dashboard`
  - Siempre devuelve `NextResponse.next({ request })` (actualiza cookies si hubo refresh)

**Nota importante**: `@supabase/ssr` solo escribe cookies (`setAll`) cuando ocurre un **refresh real** de sesión. Una sesión válida no modifica cookies — por eso se usa `getUser()` (validación activa) en lugar de asumir presencia de cookie.

## 7. Modelo de datos, RLS y Políticas

Esquema completo en `supabase/schema.sql` (idempotente: `CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS`).

### Tablas

#### `clients` (`l.1–27`)
| Columna | Tipo | Restricciones |
|---|---|---|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` |
| `name` | `text` | `NOT NULL` |
| `email` | `text` | `NOT NULL` |
| `company` | `text` | `NOT NULL` |
| `created_at` | `timestamptz` | `DEFAULT now()` (no editable) |

Índices: `clients_name_idx`, `clients_company_idx`, `clients_created_at_desc_idx` (soportan orden/búsqueda listados).

#### `shipments` (`l.29–68`)
| Columna | Tipo | Restricciones |
|---|---|---|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` |
| `reference` | `text` | `NOT NULL UNIQUE` |
| `client_id` | `uuid` | `NOT NULL`, FK → `clients(id)` `ON DELETE NO ACTION` (explícito) |
| `origin` | `text` | `NOT NULL` |
| `destination` | `text` | `NOT NULL` |
| `modality` | `text` | `NOT NULL` (`FCL`, `LCL`, `AIR` – dominio en app) |
| `status` | `text` | `NOT NULL` (`Pendiente`,`En tránsito`,`Entregado`,`Retrasado`,`Cancelado`) |
| `eta` | `date` | `NOT NULL` (`yyyy-mm-dd`) |
| `created_at` | `timestamptz` | `DEFAULT now()` |

Índices: `shipments_client_id_idx`, `shipments_status_idx`, `shipments_modality_idx`, `shipments_eta_idx`, `shipments_created_at_desc_idx`.

### RLS y Políticas (`l.70–111`)

```sql
alter table public.clients enable row level security;
alter table public.shipments enable row level security;
```

| Tabla | SELECT | INSERT | UPDATE | DELETE | Explicación |
|---|---|---|---|---|---|
| `clients` | `auth.uid() IS NOT NULL` | `auth.uid() IS NOT NULL` | `auth.uid() IS NOT NULL` | `auth.uid() IS NOT NULL` | Borrado permitido: la UI lo expone (`DeleteClientDialog` + `deleteClientAction`). Un cliente con embarques es rechazado por la FK (`23503`). |
| `shipments` | `auth.uid() IS NOT NULL` | `auth.uid() IS NOT NULL` | `auth.uid() IS NOT NULL` | `auth.uid() IS NOT NULL` | Borrado permitido (requerido por enunciado). |

**Decisión clave (seguridad por diseño):**

- **El DELETE de `clients` está habilitado en RLS igual que el de `shipments`.** La UI lo expone (`DeleteClientDialog` + `deleteClientAction`) y la BD concede lo mismo: no se compensa un botón ausente dejando la política afuera, porque quien ignore la UI puede llamar directo a PostgREST con un JWT válido.
- **`ON DELETE NO ACTION` en FK `shipments.client_id → clients.id`**: impide cascada silenciosa. Un cliente con embarques no se puede borrar: la FK responde `23503` y `deleteClientAction` lo traduce a "tiene embarques asociados".
- **RLS permisivo en operaciones permitidas** (todas authenticated). No hay multi-tenancy aquí (app mono-usuario/operativo). Añadir `organization_id` + políticas por tenant sería complejidad sin requisito.

## 8. Validación, Sanitización y Allowlists

La app **nunca** toma parámetros crudos de URL/FormData para interpolarlos directamente sin validación.

### Zod (Server-side validation)

**Clientes** – `src/lib/validations/client.ts`
```ts
export const clientSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  email: z.string().trim().min(1, "El email es obligatorio").email("Email inválido"),
  company: z.string().trim().min(1, "La empresa es obligatoria"),
});
export type ClientFormValues = z.infer<typeof clientSchema>;
```

**Embarques** – `src/lib/validations/shipment.ts`
- `SHIPMENT_STATUSES` = `["Pendiente","En tránsito","Entregado","Retrasado","Cancelado"]` (l.1–7)
- `SHIPMENT_MODALITIES` = `["FCL","LCL","AIR"]` (l.9–13)
- `shipmentSchema` (l.15–30): valida `reference`, `client_id` (UUID), `origin`, `destination`, `modality` (enum), `status` (enum), `eta` (regex `^\d{4}-\d{2}-\d{2}$` – formato ISO date, evita parsing ambiguo)
- `ShipmentFormValues` tipo inferido

**Importante**: `eta` viaja como `yyyy-mm-dd` string (coincide con `date` de Postgres). No se construye `new Date()` en ida para evitar off-by-timezone (ver Sección 14).

### Allowlists para query params (defensa contra injection vía URL)

**Columnas ordenables** – `src/app/(dashboard)/embarques/page.tsx:32–41`
```ts
const SORTABLE_COLUMNS = new Set([
  "reference","origin","destination","modality","status","eta","created_at",
  "client_name","client_company",
]);
```
El `sort` crudo se valida: si no está en Set → fallback `created_at`. Nunca se interpola string arbitrario en cláusula ORDER de PostgREST sin whitelist.

**Status/Modality** – validados contra `SHIPMENT_STATUSES`/`SHIPMENT_MODALITIES` (`page.tsx:43–61`, también usados en filtros). Valor desconocido = **sin filtro** (equivale a "Todos", codificado como parámetro ausente).

**Paginación** – `parsePage` (`clientes/page.tsx:20`, `embarques/page.tsx:55`): usa `Number(value)` (no `parseInt`). `"2abc"` → `NaN` → fallback `1`. Límite duro `PAGE_SIZE = 10`.

### Sanitización de búsqueda (`formatSearchTerm`)

`src/lib/utils.ts:16–28`
```ts
export function formatSearchTerm(term: string) {
  if (!term) return "";
  // Remove characters that could be interpreted as wildcards/operators in text search contexts
  return term
    .replace(/[%*()]/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}
```

**Por qué**: el listado de embarques usa `.or()` con múltiples `ilike` (`%${search}%`) sobre reference/origin/destination y joins con clients (`embarques/page.tsx:130–140`). Aunque PostgREST con `ilike` + valores interpolados no es SQL string concatenado directo (usa parámetros), esta normalización **limpia wildcards (`% * ()`)** y colapsa espacios, evitando búsquedas confusas o patrones no deseados. Es una **defensa por robustez** (defense-in-depth).

## 9. Manejo de errores y concurrencia

### Mapeo de errores por código PostgREST (no por mensaje)

Las Server Actions **nunca muestran el `error.message` crudo** de Supabase (inglés, puede exponer nombres de constraints/policies). Mapean por `code`.

**Embarques** – `src/app/actions/embarques.ts:67–113`, `139–188`, `214–249`

| Código | Significado | Mensaje español |
|---|---|---|
| `23505` | Violación UNIQUE (`shipments.reference`) | *"Ya existe un embarque con esa referencia"* |
| `23503` | Foreign Key inexistente (`client_id`) | *"El cliente seleccionado no existe"* |
| `23502` / `23514` | NOT NULL / CHECK violation | *"Faltan datos obligatorios o no cumplen las condiciones"* |
| `42501` | Permisos insuficientes (RLS/policy) | *"Sin autorización para la operación"* |
| `PGRST116` | `.eq("id", ...)` no devolvió filas (no match) | *"El registro ya no existe"* (usado en update/delete) |

Cualquier código no mapeado → mensaje genérico: *"No se pudo completar la operación. Inténtalo de nuevo."*

**Clientes** – `src/app/actions/clientes.ts` sigue lógica similar (mapea `23505` si hubiera UNIQUE futuro, `PGRST116` en update/delete).

### Borrados de cero filas son tratados como fallo

`deleteShipmentAction` (l.191–250):
```ts
const { data, error } = await supabase
  .from("shipments")
  .delete()
  .eq("id", id)
  .select("id"); // ← clave

if (error) { /* map code */ }
if (!data || data.length === 0) {
  return { success: false, error: "El registro ya no existe" };
}
```

**Por qué `.select("id")`**: `.delete().eq("id",id)` sin `.select()` devuelve `data: null` y **sin error** cuando no hay coincidencia. Sin este chequeo, devolveríamos `{ success: true }` para un registro que ya fue borrado (o nunca existió) — incorrecto para UX/consistencia. Con `.select()` sabemos **exactamente** cuántas filas se eliminaron.

**Update** también detecta fila desaparecida: si tras `.update()` + `.select()` no retorna fila → `PGRST116` → *"El registro ya no existe"* (optimistic case: otro usuario lo eliminó/ modificó entre carga y guardado).

### Concurrencia (estado actual)

Hoy es **last-write-wins** (no hay optimistic locking). Los updates filtran solo por `id` (`.eq("id", target.data.id)`). Dos pestañas editando el mismo registro se pisan silenciosamente.

**Mejora identificada (producción):** añadir `updated_at timestamptz DEFAULT now()` + incluirlo como predicado en update (`.eq("id", id).eq("updated_at", originalUpdatedAt)`) → si no match, retorna 0 filas → mapear a *"Otro usuario modificó este registro. Recarga y vuelve a intentarlo."*

## 10. Estado en URL, Paginación, Filtros y Ordenamiento

El listado vive en **query params** (shareable, refresh-safe, back/forward correcto).

### Clientes (`src/app/(dashboard)/clientes/page.tsx`)
Params: `search`, `sort`, `order`, `page`
- Búsqueda: `.or(\`name.ilike.%${s}%,company.ilike.%${s}%,email.ilike.%${s}%\`)` (con `formatSearchTerm`)
- Orden: `sort` validado (allowlist implícita: columnas existentes) + `order` 'asc'|'desc' (fallback desc)
- Paginación: `range((p-1)*PAGE_SIZE, p*PAGE_SIZE-1)`, `count: 'exact'`

### Embarques (`src/app/(dashboard)/embarques/page.tsx`)
Params: `search`, `status`, `modality`, `sort`, `order`, `page`
- Join: `.select('*, client:clients(name,company)', { count: 'exact' })`
- Búsqueda OR multi-campo (reference, origin, destination, client.name, client.company)
- Filtros `.eq()` solo si valor está en allowlists (`status`/`modality`). Ausente = "Todos".
- Orden dinámico: mapea `client_name`/`client_company` a columnas del join (`clients(name)`, `clients(company)`) vía `resolveSortColumn` (l.44–53). Esto evita exponer paths inseguros.
- Paginación server-side con range + total count.

**Regla**: *"Todos"* **nunca** se codifica como `""` (cadena vacía). Se codifica como **parámetro ausente**. Esto evita ambigüedad con Base UI (ver Sección 11).

## 11. UI, Componentes y Estilos (Tailwind v4 + shadcn/ui + Base UI)

### shadcn/ui sobre @base-ui/react (diferencias críticas)

`components.json` style `base-nova`. Componentes importan `@base-ui/react/*` (no Radix). **Memorizar estas diferencias** para no introducir bugs silenciosos:

| Aspecto | Base UI | Radix (memoria muscular) | Dónde aplicar |
|---|---|---|---|
| **`onValueChange`** | `(value, eventDetails)` – recibe **valor crudo primero** (string|null). No es CustomEvent. | `(event)` con `event.target.value` | `src/components/ui/select.tsx`, cualquier Select controlado |
| **Select items** | Requiere prop `items={[{value,label}]}` en `Select.Root` (o estructura esperada). El trigger muestra `label`, no contenido de `Select.Item` si no se provee items. | Items anidados (`SelectItem` children) | `clients/client-select.tsx`, `embarques/shipment-form.tsx` |
| **Valor "Todos"** | Usar **`null`**, **nunca `""`**. Base UI calcula `hasSelectedValue = value != null && serializedValue !== ''`. `""` se trata como *sin valor* → muestra placeholder. | A veces `""` | Filtros Status/Modality (Selects). Ver `embarques/shipments-filters.tsx`, `clientes/clients-filters.tsx` |
| **AlertDialogAction** | Es botón puro, **no cierra el diálogo automáticamente**. Solo `AlertDialogCancel` envuelve `AlertDialogPrimitive.Close`. | Suele cerrar por defecto | `src/components/embarques/delete-shipment-dialog.tsx` – acción cierra solo en `success`, **permanece abierto** si falla (muestra error). Correcto por diseño. |
| **Portales/accésibilidad** | Usa primitives con buen a11y (ARIA), API más explícita. | Similar | Transversal |

### Componentes UI modificados (Bento Redesign)

Cambios relevantes para look&feel:

- **`src/components/ui/card.tsx`**: sin borde, `rounded-2xl`, `shadow-sm`, radios ajustados header/footer. Base para elevación.
- **`src/components/ui/button.tsx`**: `rounded-xl` base, default size `rounded-full` (pill-like).
- **`src/components/ui/input.tsx`**: `border-none rounded-xl bg-muted` (search/header look).
- **`src/components/ui/badge.tsx`**: `rounded-full`.
- **`src/components/ui/hover-elevation.tsx`**: wrapper Motion con `whileHover={{ scale, y }}`; sus valores (`HOVER_DURATION`, `HOVER_SCALE`, `HOVER_Y`) y el colapso de `prefers-reduced-motion` salen del sistema compartido en `src/components/ui/motion.tsx`.

### Estados de carga

**Prohibido** `"Cargando..."` (convención del proyecto). Usar **Skeletons**.

- Dashboard: `DashboardSkeleton` en `dashboard/page.tsx:230–292` (coincide con layout 4 filas)
- Listados: suelen usar `Skeleton` en tablas/contadores mientras carga (patrón consistente)

## 12. Dashboard, Gráficos y Tokens de Color

### Tokens semánticos (CSS Variables) – `src/app/globals.css`

Definidos en `:root` (light) y `.dark`:

```css
:root {
  --primary: oklch(0.52 0.17 256);    /* azul corporativo ~ #0E66C8 */
  --accent:  oklch(0.93 0.045 235);   /* celeste suave (superficie) */
  --success: oklch(0.60 0.15 155);    /* verde ~ #009956 */
  --warning: oklch(0.72 0.15 75);     /* ámbar ~ #DA950B */
  --neutral: oklch(0.62 0.02 260);    /* slate */
  --danger:  oklch(0.58 0.21 27);     /* rojo ~ #DB2C2B */
  --chart-1: oklch(0.52 0.17 256);    /* azul   */
  --chart-2: oklch(0.70 0.13 230);    /* celeste */
  --chart-3: oklch(0.60 0.13 195);    /* cian   */
  --chart-4: oklch(0.62 0.02 260);    /* gris   */
  --chart-5: oklch(0.42 0.02 260);    /* gris oscuro */
}
@theme inline {
  --color-primary: var(--primary);
  --color-accent:  var(--accent);
  --color-chart-1: var(--chart-1);
  --color-success: var(--success);
  /* ... resto (sidebar, neutral, danger, etc.) */
}
```

Ventaja: la identidad corporativa (azul + celeste + blancos/grises) vive en los tokens y se hereda sola; los estados conservan su significado (éxito/advertencia/peligro). Los gráficos consumen un mapa central (`src/components/dashboard/chart-colors.ts`) en vez de literales por componente.

### Mapeo de colores por componente

| Uso | Archivo | Mapeo |
|---|---|---|
| **KPIs (StatCard)** | `src/components/dashboard/stat-card.tsx:8–45` | `iconColor`: `primary`, `info`, `success`, `warning`, `danger` (todos sobre tokens, sin hex hardcodeado). Envuelto por `stat-card-motion.tsx` (HoverElevation + FadeIn). |
| **Donut – Estado embarques** | `chart-colors.ts` (`CHART_STATUS_COLORS`) | `Pendiente: neutral`, `"En tránsito": chart-2 (celeste)`, `Entregado: success`, `Retrasado: danger`, `Cancelado: muted-foreground` |
| **Barras – Modalidad** | `chart-colors.ts` (`CHART_MODALITY_COLORS`) | `FCL: chart-1 (azul)`, `LCL: chart-2 (celeste)`, `AIR: chart-4 (gris)` |
| **Área – Timeline** | `chart-colors.ts` (`CHART_PRIMARY_COLOR`) | `stroke="var(--color-primary)"`, `fill="url(#timeline-gradient)"` (gradiente del primario 0.3→0) |
| **Badges de estado** | `src/components/embarques/shipment-status-badge.tsx:20–26` | Clases Tailwind directas (inclusión estática en build): `Pendiente` slate, `En tránsito` sky, `Entregado` emerald, `Retrasado` red, `Cancelado` gray (light/dark). |

### Layout Dashboard (Bento simplificado)

`src/app/(dashboard)/dashboard/page.tsx` (layout actual):

1. **Row 1** – 3 KPIs: `grid gap-4 sm:grid-cols-3` (Totales, En tránsito, Retrasados)
2. **Row 2** – 2 charts lado a lado: `grid gap-6 md:grid-cols-2` (Status Donut + Modality Bar) vía `DashboardCharts` con `mode="status"` y `mode="modality"`
3. **Row 3** – Timeline full width: `mode="timeline"`
4. **Row 4** – Últimos embarques full width: `<Card>` con lista + `ShipmentStatusBadge`

`DashboardCharts` (`src/components/dashboard/dashboard-charts.tsx`) renderiza cada Card con `FadeIn` + `HoverElevation`, carga los tres gráficos con `next/dynamic` (`ssr: false` + skeleton que reserva 280px, así la librería de charts queda fuera del bundle inicial), y mantiene compatibilidad `all` (legacy).

App shell bg: `src/app/(dashboard)/layout.tsx` → `bg-slate-50` (light). Dark mode respeta tokens globales.

## 13. Seguridad: Aprendizajes Clave

Esta es la sección más importante para aprender. Resume decisiones aplicadas:

| Medida | Dónde | ¿Qué evita / por qué? |
|---|---|---|
| **1. Verificación de sesión en Server Actions** | `actions/*.ts` → `supabase.auth.getUser()` tras crear cliente | Protege mutaciones si alguien invoca Action directamente (bypass parcial de navegación). Segunda capa. |
| **2. Defensa en profundidad (3 capas)** | Middleware + Actions + RLS | Ninguna capa es suficiente sola. Fallo en una no rompe seguridad global. |
| **3. DELETE en `clients` gateado por RLS y por la FK** | `supabase/schema.sql` (política + `shipments.client_id`) | La RLS permite el borrado (la UI lo expone); la FK `ON DELETE NO ACTION` rechaza con `23503` a un cliente con embarques, sin cascada silenciosa. |
| **4. FK `ON DELETE NO ACTION`** | `shipments.client_id` (schema l.42) | Impide cascada silenciosa de embarques al borrar cliente. Protege integridad referencial. |
| **5. Allowlists en query params** | `embarques/page.tsx:32–61`, validación sort/status/modality | Impide inyección vía `?sort=`, `?status=` arbitrarios. Solo valores permitidos llegan a `.order()`/`.eq()`. |
| **6. `formatSearchTerm`** | `lib/utils.ts:16–28` | Normaliza búsqueda (elimina `% * ( )`, colapsa espacios) antes de `.or()` con `ilike`. Robustez + búsqueda predecible. |
| **7. Errores por código, no por mensaje** | `actions/embarques.ts:67–113` | Filtra mensajes crudos de Supabase (internals, constraints, nombres de policies). Expone UX en español. |
| **8. Columnas escribibles explícitas** | `.insert({ name,email,company })`, `.insert({ reference,client_id,origin,destination,modality,status,eta })` | **Mass assignment prevention**: nunca enviamos `id` ni `created_at`. Aunque manipulen FormData, no pueden elegir UUID/fecha de alta. |
| **9. UUID validado antes de consulta** | `embarques/[id]/page.tsx:26–36` | Valida `id` con `z.string().uuid()` ANTES de llamar a BD. Evita round-trips inútiles y consultas que nunca matchean. |
| **10. `.select("id")` en DELETE** | `deleteShipmentAction:210–220` | Detecta **borrado de 0 filas** (no match) → trata como fallo (`"El registro ya no existe"`). Evita reportar éxito falso. |
| **11. Detección fila desaparecida (PGRST116)** | Update/Delete actions | Caso optimista: registro eliminado/editado entre carga y submit → error claro, no silent failure. |
| **12. Credenciales fuera de repo** | `.gitignore` (`.env*`, `!.env.local.example`) | `.env.local` no se versiona. `.env.local.example` documenta variables requeridas. |
| **13. Clave publicable vs secreta** | `.env.local.example`, README | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` es pública por diseño (viaja a browser). **Nunca** usar `service_role`/clave secreta en cliente o con `NEXT_PUBLIC_`. |
| **14. Validación servidor-side obligatoria** | Zod en Actions (nunca solo cliente) | Cliente puede manipularse. Validación en servidor es innegociable. |
| **15. Dominio acotado (app-level)** | `SHIPMENT_STATUSES/MODALITIES` + Zod enums | Valores permitidos viven en validaciones + allowlists. (Nota: BD usa `text` libre — decisión deliberada documentada; mejora sugerida: enums/ CHECK en producción). |

### Lecciones de seguridad prácticas a aprender

1. **Defense-in-depth > single barrier.** Middleware UX, Actions lógica, RLS físico.
2. **Treat "not found" differently on mutations.** `.delete().eq()` sin match no es error DB pero **sí es caso de negocio** a reportar (usar `.select()`).
3. **Map errors by code, not string.** Evita filtrar leaks internos y hace i18n/UX controlado.
4. **Explicit column lists on writes.** Nunca `insert(data)` con objeto completo no filtrado. Solo columnas permitidas.
5. **Validate IDs early (shape).** UUID regex/Zod antes de query evita trabajo innecesario y ataques de enumeración por formatos.
6. **Allowlists > sanitization alone for constrained values.** Para `sort/status/modality`, **allowlist** es correcto (rechaza/ignora desconocido). Para texto libre búsqueda, **normalización** suficiente.

## 14. Fechas, Timezones y Datos del Seed

### Parsing de fechas (`eta`)

- `eta` = `date` (Postgres). Viaja como `yyyy-mm-dd` (string ISO). Zod valida con regex `^\d{4}-\d{2}-\d{2}$` (`shipment.ts:24`).
- **Problema timezone**: `new Date("2026-10-15")` se interpreta como **medianoche UTC**. En offset negativo (p.ej. Argentina UTC-3) formatearlo puede mostrar 14/oct incorrectamente.
- Solución: `formatDate` (`src/lib/utils.ts:30–41`)
  ```ts
  export function formatDate(value: string | Date) {
    if (!value) return "";
    const date = typeof value === "string" && !value.includes("T")
      ? new Date(`${value}T00:00:00`)  // parse en hora local
      : new Date(value);
    return date.toLocaleDateString("es-AR", { day:"2-digit", month:"2-digit", year:"numeric" });
  }
  ```
  Añade `T00:00:00` cuando no trae timezone → parseo **local**, evita shift UTC.
- `formatDateTime` (l.43–54): para `timestamptz` (created_at) – incluye hora/minutos/segundos.
- **Nunca** intercambiar: pasar `yyyy-mm-dd` a `formatDateTime` mostraría día corrido (no deseado). Uso correcto por tipo.

### Seed con fechas relativas

`supabase/seed.sql` usa `current_date` + `make_interval()` (no literales fijos). Ej.: `eta = (current_date + make_interval(days => (i % 25) + 2))::date`. Esto evita que el dataset "envejezca" con el tiempo (los embarques siguen siendo coherentes respecto a hoy).

## 15. Roadmap de aprendizaje (recomendado para leer en orden)

Para entender la app **de lo general a lo específico**, sigue este orden:

| Paso | Qué leer | Por qué |
|---|---|---|
| **1.** | `README.md` | Visión, setup, DB, decisiones globales |
| **2.** | `src/app/layout.tsx` + `src/app/(dashboard)/layout.tsx` | Root + shell autenticado, Toaster, bg, Motion |
| **3.** | `src/middleware.ts` + `src/lib/supabase/middleware.ts` | Capa 1 (navegación + refresh sesión) |
| **4.** | `src/lib/supabase/server.ts` + `client.ts` | Clientes SSR vs browser (diferencia cookies) |
| **5.** | `src/types/database.ts` | Tipos generados Supabase (contrato BD) |
| **6.** | `supabase/schema.sql` | Modelo + RLS + políticas (fundamental seguridad) |
| **7.** | `src/lib/validations/*.ts` | Zod + allowlists (contrato entrada) |
| **8.** | `src/lib/utils.ts` | `cn`, `formatSearchTerm`, `formatDate/DateTime` |
| **9.** | `src/app/actions/auth.ts` | Login/logout + patrón Server Actions |
| **10.** | `src/app/actions/clientes.ts` | CRUD + verificación user + mapeo errores |
| **11.** | `src/app/actions/embarques.ts` | CRUD + mapeo completo códigos PostgREST (clave) |
| **12.** | `src/app/(dashboard)/clientes/page.tsx` + `components/clientes/*` | Lectura server + filtros URL + UI cliente |
| **13.** | `src/app/(dashboard)/embarques/page.tsx` + `components/embarques/*` | Join, OR search, sort con joins, paginación |
| **14.** | `src/app/(dashboard)/dashboard/page.tsx` + `components/dashboard/*` | KPIs paralelos, charts, tokens colores |
| **15.** | `src/components/ui/*` (card, select, dialog, button) | Base UI differences + primitives |
| **16.** | `src/app/(dashboard)/embarques/[id]/page.tsx` | UUID validation early + edición |
| **17.** | `supabase/seed.sql` | Datos + fechas relativas |

## 16. Trampas conocidas y lecciones a tomar

| Trampa | ¿Por qué pasa? | Solución/aprendizaje |
|---|---|---|
| **Select Base UI no muestra label con items** | API Base UI espera `items` array, no confiar solo en `SelectItem` children. | Usar `items={[{value,label}]}` o estructura correcta. |
| **Valor "Todos" no aparece** | Usar `""` (vacío) → Base UI lo trata como sin valor (muestra placeholder). | Usar **`null`** para representar "sin filtro". |
| **AlertDialogAction no cierra modal** | Base UI no auto-cierra Action (difiere Radix). | Solo Cancel envuelve Close. Cerrar Action manualmente **solo en éxito** (permite mostrar error si falla) — patrón correcto aquí. |
| **Delete retorna éxito falso-positivo** | `.delete().eq()` sin `.select()` no error si 0 filas. | Siempre `.select("id")` + chequear `data.length === 0`. |
| **Timezone shift en fechas `yyyy-mm-dd`** | `new Date("2026-10-15")` UTC midnight. | Añadir `T00:00:00` para parse local (`formatDate`). |
| **RLS parece "no funcionar" al correr seed desde cliente** | Seed/API con clave publicable corre como rol anon/authenticated → políticas exigen `auth.uid()` → 0 filas. | Ejecutar `schema.sql` + `seed.sql` **desde Editor SQL de Supabase** (rol `postgres`, bypass RLS). Explicado en README. |
| **Warning middleware deprecated (Next 16)** | Convención `middleware.ts` deprecada a favor `proxy`. | Warning esperado (no rompe). Migración opcional con codemod en commit aparte. |
| **Usar `"Cargando..."`** | UI convention. | Usar **Skeletons** siempre para estados de carga. |

---

**Recomendación final:** Para aprender de verdad, **abre los archivos citados y léelos en el orden del roadmap #15**. Esta guía apunta a *entender el porqué* (decisiones) más que el *qué* (código). Ahí está el valor de aprendizaje.