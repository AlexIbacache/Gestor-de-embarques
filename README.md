# Gestor de Embarques

Gestor de embarques logísticos con autenticación y CRUD completo de clientes y embarques, construido sobre Next.js App Router y Supabase (Postgres + Auth + RLS). Los listados filtrables, ordenables y paginados se resuelven en el servidor; la base de datos es la última línea de defensa, no la primera.

## Despliegue de prueba (Vercel)

| Dato | Valor |
| --- | --- |
| **URL** | https://gestor-de-embarques.vercel.app/login |
| **Usuario** | `admin@test.com` |
| **Contraseña** | `admintest` |

> Este usuario está pre-creado en el proyecto de Supabase del despliegue. Permite probar la autenticación, el dashboard, CRUD de clientes y embarques, filtros, ordenamiento y paginación sin configurar nada localmente.

## Stack

| Pieza | Versión | Rol |
| --- | --- | --- |
| Next.js | 16.3.8 | App Router, Server Components, Server Actions, middleware |
| React | 19.2.8 | Runtime de componentes |
| TypeScript | ^5 | Tipado estricto sobre los payloads de Supabase |
| Tailwind CSS | ^4 | Estilos, vía `@tailwindcss/postcss` |
| shadcn/ui (style `base-nova`) | ^4.21.0 | Componentes sobre **Base UI** (`@base-ui/react` ^1.8.0), no Radix |
| Supabase | `@supabase/supabase-js` ^2.117.2, `@supabase/ssr` ^0.12.7 | Postgres, Auth y cliente SSR con cookies |
| Zod | ^4.6.5 | Validación de entrada en las Server Actions |
| Motion | ^13.4.6 | Animaciones de entrada y del contenido navegado |
| Lucide | `lucide-react` ^1.49.0 | Iconografía |
| Sonner | ^2.0.8 | Notificaciones de resultado |

## Requisitos previos

- **Node.js** (la versión que requiera Next 16; el proyecto no fija `engines`).
- **pnpm 12.6.0**, declarado en `packageManager`. El proyecto **no** tiene `package-lock.json`: `pnpm-lock.yaml` es el único lockfile, así que hay que usar pnpm o las versiones resueltas dejan de ser reproducibles.
- Un **proyecto de Supabase** con Auth habilitado.

pnpm se habilita con Corepack, que viene incluido con Node.js:

```bash
corepack enable pnpm
```

## Instalación

```bash
pnpm install
```

Variables de entorno: copiá `.env.local.example` a `.env.local` y completá los dos valores (ver la sección siguiente).

```bash
pnpm dev          # servidor de desarrollo en http://localhost:3000
pnpm build        # build de producción
pnpm start        # sirve el build
pnpm lint         # ESLint
pnpm exec tsc --noEmit   # verificación de tipos sin emitir archivos
```

## Variables de entorno

`.env.local.example` define exactamente dos:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

| Variable | Dónde se usa | Notas |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `src/lib/supabase/{client,server,middleware}.ts` | URL del proyecto |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ídem | Clave publicable |

Los valores se copian del Dashboard de Supabase → Project Settings → API. Usá placeholders como `https://<project-ref>.supabase.co` y `sb_publishable_<...>`; no pegues claves reales en archivos que se versionen.

Sobre la seguridad: la clave **publicable** es pública por diseño y viaja al navegador —el prefijo `NEXT_PUBLIC_` la marca como tal y por eso existe el naming—. La clave **secreta** (`sb_secret_...`) nunca debe llegar al código cliente: no tiene prefijo `NEXT_PUBLIC_`, no debe usarse en un componente `"use client"` y no debe aparecer en ninguna variable con ese prefijo. `.env.local` está en `.gitignore` (`.env*` con la excepción `!.env.local.example`), así que no se versiona.

Si las dos variables quedan vacías, `createClient()` lanza al evaluarse: por eso las páginas autenticadas declaran `export const dynamic = "force-dynamic"`.

## Configuración de la base de datos

El orden importa y es la causa más común de ver la aplicación vacía.

| # | Paso | Dónde | Resultado |
| --- | --- | --- | --- |
| 1 | `supabase/schema.sql` | Editor SQL de Supabase | Tablas `clients` y `shipments`, índices, FK, RLS habilitado y políticas |
| 2 | Crear un usuario de Auth | Dashboard → Authentication → Users | La única vía de entrada: la app no tiene registro |
| 3 | `supabase/seed.sql` | Editor SQL de Supabase | 15 clientes y 40 embarques |

### Por qué el editor SQL y no la API

Los dos scripts deben ejecutarse **desde el editor SQL de Supabase**, que corre como el rol `postgres` y por lo tanto bypassa RLS.

Corridos sobre PostgREST con la clave publicable insertan **cero filas en silencio**, sin error visible: todas las políticas exigen `auth.uid() is not null` y sin sesión de Auth eso es `NULL`, así que cada `insert` y cada `select` devuelve vacío. El seed empieza con dos `delete` y termina con dos `select` de conteo; si esos conteos dan 0, el problema es el rol con el que se ejecutó el script, no el SQL ni el código de la aplicación.

El usuario de Auth del paso 2 es obligatorio y no tiene alternativa: no hay flujo de signup en la aplicación, así que sin un usuario creado desde el Dashboard no hay forma de iniciar sesión.

`schema.sql` y `seed.sql` son **idempotentes**. `schema.sql` usa `create table if not exists` y `drop policy if exists`; `seed.sql` borra primero lo que él mismo sembró (`reference like 'EMB-%'` y `email like '%@seed.logistica.test'`) antes de insertar, así que se puede volver a correr sin duplicar nada.

## Modelo de datos

Dos tablas y una relación. Todo el esquema está en `supabase/schema.sql`, que se ejecuta entero y es idempotente.

```
clients ──1:N──> shipments
```

### `clients`

| Columna | Tipo | Restricciones | Nota |
| --- | --- | --- | --- |
| `id` | `uuid` | PK, `default gen_random_uuid()` | Generado por la base, nunca por la app |
| `name` | `text` | `not null` | |
| `email` | `text` | `not null` | Validado como email por Zod, no por la base |
| `company` | `text` | `not null` | |
| `created_at` | `timestamptz` | `default now()` | No editable; sobrevive a un update |

Índices: `name`, `company`, `created_at desc` — los tres son rutas de ordenamiento o búsqueda del listado.

### `shipments`

| Columna | Tipo | Restricciones | Nota |
| --- | --- | --- | --- |
| `id` | `uuid` | PK, `default gen_random_uuid()` | |
| `reference` | `text` | `not null` **`unique`** | Unicidad → código `23505` mapeado a un mensaje propio |
| `client_id` | `uuid` | `not null`, FK → `clients (id)` | `ON DELETE NO ACTION` (default explícito) |
| `origin` | `text` | `not null` | |
| `destination` | `text` | `not null` | |
| `modality` | `text` | `not null` | `FCL`, `LCL`, `AIR` — dominio de la app, ver más abajo |
| `status` | `text` | `not null` | `Pendiente`, `En tránsito`, `Entregado`, `Retrasado`, `Cancelado` |
| `eta` | `date` | `not null` | Viaja como `yyyy-mm-dd` en ambas direcciones |
| `created_at` | `timestamptz` | `default now()` | |

Índices: `client_id`, `status`, `modality`, `eta`, `created_at desc` — FK, los dos filtros de listado y los dos ordenamientos.

### Tres decisiones del modelo

**`NOT NULL` en toda columna de negocio.** Las Server Actions ya validan con Zod, pero la base no debe depender de esa validación: son dos capas que fallan de forma distinta y una no sustituye a la otra.

**`id` y `created_at` se excluyen explícitamente de todo insert y update.** No vienen en el payload que la app construye (`insert({ name, email, company })`), así que un cliente malicioso no puede elegir su propio UUID ni su fecha de alta aunque manipule el `FormData`.

**`modality` y `status` son `text`, no `enum` ni `CHECK`.** Es la inconsistencia más visible del esquema, y está anotada en la sección de qué mejoraría para producción: el dominio de valores vive en `src/lib/validations/shipment.ts` y en las allowlists de la capa de consulta, no en la base.

## Decisiones de arquitectura

### Server Components y Server Actions

Las páginas son Server Components y leen los datos directamente. Los únicos archivos con `"use client"` son las hojas interactivas: formularios, tablas, filtros, diálogos y los componentes de `ui/` que los envuelven. Ninguna hoja importa `createClient`; la capa de datos no entra al bundle cliente, y la validación con Zod vive en el servidor, en las Server Actions.

### El middleware es defensa en profundidad

`src/middleware.ts` refresca la sesión de Supabase y redirige, pero no es la única barrera. La idea es que ninguna capa es suficiente por sí sola:

- El **middleware** mejora la navegación: refresca la sesión en cada request cubierta por el `matcher` y manda a `/login` a quien no tiene usuario, preservando el destino en `?next=`.
- Las **Server Actions** vuelven a verificar la sesión con `supabase.auth.getUser()` en cada mutación y responden con un error de autorización si no hay usuario. Si alguien invoca una action directamente, el middleware no lo detiene.
- **RLS** es la tercera capa: si todo lo anterior fallara y una petición llegara a Postgres con un JWT inválido o sin él, ninguna política concede acceso.

La presencia de una cookie de auth no se usa como señal de "sesión iniciada" a propósito: `@supabase/ssr` solo llama `setAll` cuando hay un refresh real, así que un request con una sesión todavía válida no escribe ninguna cookie. Quien necesita saber quién está conectado usa `updateSessionWithUser`.

### RLS: permisiva en permisos, restrictiva en capacidades

Las políticas son `auth.uid() is not null` para las operaciones que la aplicación ofrece, y **no hay política de borrado sobre `clients`**. Esa asimetría es intencional:

| Tabla | select | insert | update | delete |
| --- | --- | --- | --- | --- |
| `clients` | ✅ | ✅ | ✅ | **❌ sin política** |
| `shipments` | ✅ | ✅ | ✅ | ✅ |

**La ausencia de la política de delete es el control**, no un descuido. El enunciado pide borrar *embarques*; clientes son crear, leer y editar. Un botón deshabilitado es un hecho de UI, no una garantía de seguridad: quien evaluator no respeta el flujo de la interfaz puede llamar al endpoint REST de Supabase directamente con un JWT válido. Sin política de delete, PostgREST responde `42501` a cualquier llamada directa autenticada, así que la base de datos —y no el frontend— es la que cierra la puerta.

`shipments.client_id` referencia `clients (id)` con `ON DELETE NO ACTION`, así que un borrado en cascada nunca podría eliminar los embarques de un cliente en silencio. Esa constraint es la **segunda** capa: no sustituye a la policy y solo dispara para clientes que ya tienen embarques.

Ser permisivo en el resto **es una decisión deliberada de alcance, no una omisión**. No hay multi-tenancy en este proyecto: un gestor de embarques es un usuario operativo, no un inquilino, y agregar una columna `organization_id` más políticas por organization para un producto de un solo cliente sería complejidad sin requisito.

Lo que cambiaría en un producto multi-tenant: una columna `owner_id` u `organization_id` en cada tabla, políticas `using (organization_id = (select auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid)` —con `select` sobre la función para que la expresión sea estable en RLS—, un `org_id` en el JWT y actualización del token al cambiar de organización. El resto de la arquitectura no se toca: la verificación en las Server Actions pasa a comprobar pertenencia, y el middleware sigue igual.

### shadcn/ui sobre Base UI, no Radix

`components.json` declara el style `base-nova` y los componentes de `src/components/ui/` importan de `@base-ui/react/*`. La API difiere de Radix en puntos que se rompen silenciosamente:

- `onValueChange` recibe el **valor crudo primero**: `onValueChange(value, eventDetails)`. No es un evento CustomEvent.
- Las etiquetas del `Select` salen de la prop `items` (`[{ value, label }]`), no del contenido de `SelectItem`. Sin `items`, el trigger muestra el string crudo.
- La opción "todos" usa **`null`, nunca `""`**. Base UI calcula `hasSelectedValue = value != null && serializedValue !== ''`, así que la cadena vacía se trata como *sin valor* y renderiza el placeholder en vez de "Todos los estados".
- `AlertDialogAction` es un `Button` pelado que **no cierra el diálogo**. Solo `AlertDialogCancel` envuelve `AlertDialogPrimitive.Close`. Eso es lo que permite que `DeleteShipmentDialog` cierre al eliminar bien y **permanezca abierto** al fallar, con el motivo en pantalla.

Quien llegue con la memoria muscular de Radix va a escribir `onValueChange={(e) => setX(e.target.value)}`, va a poner `value=""` para "todos" y va a esperar que el botón de confirmación cierre el modal. Los tres fallan.

### Fechas

`eta` es un Postgres `date` y viaja como string `yyyy-mm-dd` en las dos direcciones: PostgREST lo acepta y lo devuelve con esa forma, que es exactamente la que valida `shipmentSchema`. Nunca pasa por `new Date()` en el camino de ida.

La razón es el desfase: `new Date("2026-10-15")` se parsea como medianoche **UTC**, y formateada en un offset negativo (Argentina es UTC-3) muestra 14 oct. `formatDate` (en `src/lib/utils.ts`) evita eso: si el valor no trae `T`, le anexa `T00:00:00` para que se parsee en hora local.

`formatDate` maneja `date`, `formatDateTime` maneja `timestamptz`. No se intercambian: pasarle a `formatDateTime` un `yyyy-mm-dd` devuelve el día corrido.

### Errores mapeados por código, no por mensaje

`src/app/actions/embarques.ts` decide el copy a partir de `PostgrestError.code`:

| Código | Significado | Copy |
| --- | --- | --- |
| `23505` | Violación de unicidad (`shipments.reference`) | Ya existe un embarque con esa referencia |
| `23503` | FK inexistente (`client_id`) | El cliente seleccionado no existe |
| `23502` / `23514` | `NOT NULL` / `CHECK` | Faltan datos obligatorios / no cumplen las condiciones |
| `42501` | Sin permisos | Sin autorización para la operación |
| `PGRST116` | `.eq("id", ...)` no seleccionó filas | El registro ya no existe |

El **mensaje** de Supabase nunca se muestra: está en inglés y puede nombrar internals como el nombre de la constraint o de la política RLS. Lo que sí se muestra al usuario es la frase en español de la tabla, y en las listas el código corto como soporte. Cualquier código sin mapear cae en un mensaje genérico en vez de filtrar el error crudo.

### Borrados de cero filas son fallos

`.delete().eq("id", id)` sin selección devuelve `data: null` y ningún error: un borrado que no coincidió con nada es indistinguible de uno exitoso. Por eso las actions agregan `.select("id")` — la respuesta es el array de filas realmente eliminadas— y tratan `length === 0` como error. Devolver `success: true` ahí le diría a la interfaz que se eliminó un embarque que sigue existiendo.

### El estado del listado vive en la URL

`search`, `status`, `modality`, `sort`, `order` y `page` son query params. La vista es compartible, el botón atrás funciona y el filtro sobrevive a un refresh.

Todo valor que llega por query param pasa por una allowlist antes de tocar la consulta: `SORTABLE_COLUMNS` para `.order()` (el param crudo se interpola en la cláusula `order=` de PostgREST, así que nunca se pasa directo), `SHIPMENT_STATUSES` y `SHIPMENT_MODALITIES` para `.eq()`, y `parsePage` con `Number` —no `parseInt`, que aceptaría `"2abc"` como 2—. Las allowlists devuelven el miembro de la lista, nunca el input. El texto de búsqueda pasa por `formatSearchTerm`, que quita `%*,()` antes de que el término se interpole en el `.or()`.

Un `?status=` desconocido es la misma consulta que ningún filtro, porque "todos" se codifica como el parámetro ausente.

### Fechas relativas en el seed

Las fechas del seed se calculan con `current_date` y `make_interval`, no como literales. Con fechas absolutas el dataset envejece: en unos meses los 40 embarques figuran vencidos y el filtro por estado deja de reflejar una operación real.

## Seguridad

Decisiones de seguridad dispersas en las secciones anteriores, con la referencia de dónde vive cada una:

| Decisión | Dónde | Qué evita |
| --- | --- | --- |
| Sesión verificada en servidor | Cada Server Action | Que un JWT manipulado alcance una mutación |
| Sin policy de delete en `clients` | `supabase/schema.sql` | Borrado de clientes fuera del flujo de la UI |
| Allowlists en todo query param | `SORTABLE_COLUMNS`, `SHIPMENT_STATUSES`, `SHIPMENT_MODALITIES` | Inyección de SQL vía `?sort=`, `?status=` |
| `formatSearchTerm` | `src/lib/utils.ts` | Escapar del valor en el `.or()` de PostgREST |
| Errores por código, no por mensaje | `src/app/actions/embarques.ts` | Filtrar nombres de constraints y de policies RLS |
| Columnas escribibles explícitas | `.insert({ name, email, company })` | Mass assignment de `id` / `created_at` |
| UUID validado antes de consultar | `embarques/[id]/page.tsx` | Round-trips a consultas que no pueden matchear |
| `.select("id")` en el delete | `deleteShipmentAction` | Reportar éxito sobre un borrado de cero filas |
| Credenciales fuera del repo | `.gitignore` (`.env*` + `!.env.local.example`) | Versionar `.env.local` |

**Lo que no hay todavía:** una CSP o cabeceras de seguridad en `next.config.ts`. Para una app en producción sería la primera línea a agregar.

## Qué mejoraría si esto fuera a producción

Ordenado por lo que más duele primero. Esto no es una lista de deseos: es el ranking de lo que rompería antes o peor.

**1. Pruebas automatizadas — no hay ninguna.** Es la carencia más grande y la más difícil de recuperar tarde, porque sin tests cualquier refactor es un salto al vacío. El orden en que las escribiría:

- *Unit* para lo puro y sin DOM: `formatSearchTerm`, `formatDate` / `formatDateTime`, los parsers de query params y `resolveSortColumn`. Son funciones de un archivo, sin dependencias, y cubren la capa donde vive la sanitización.
- *Integración* para las 7 Server Actions, con la sesión real o un stub de `createClient`. Es donde está el 90% de la superficie de ataque.
- *E2E* de los cinco recorridos que el enunciado nombra: login, alta de cliente, alta de embarque, edición, borrado.
- Visual regression sobre los estados de carga, porque un skeleton desalineado es exactamente el tipo de regresión que nadie detecta a tiempo.

**2. Restricción del dominio en la base.** `status` y `modality` son `text` libre. `src/lib/validations/shipment.ts` y las allowlists los acotan, pero el esquema declara en su propio encabezado que "la base de datos no debe depender de esa validación" — y acá depende. Un `create type shipment_status as enum (...)` más `alter column status type shipment_status using status::shipment_status` cierra el dominio donde debe estar, y el `CHECK` de `reference` por formato sería lo mismo para el otro lado.

**3. Concurrencia optimista.** Los updates filtran solo por `id` (`.eq("id", target.data.id)`), así que son *last-write-wins*: dos pestañas abiertas sobre el mismo embarque se pisan en silencio y el usuario que escribió segundo no se entera de que perdió el primer cambio. No hay `updated_at` en ninguna tabla, así que hoy no hay ni siquiera con qué detectarlo. Lo sumaría como columna y lo usaría como predicado del `.update()`, devolviendo `PGRST116` como "otro usuario modificó esto".

**4. Sin trazabilidad.** Los borrados son físicos y no hay `updated_at`. En una operación logística, "quién borró qué embarque y cuándo" es un requisito, no un lujo. Soft delete (`deleted_at` + filtro) más una tabla de auditoría es lo que pediría el negocio.

**5. Límite de 200 clientes en el formulario de embarque.** `CLIENT_LIMIT = 200` acota el `Select` de clientes que se le ofrece al usuario. Hoy, con 15 clientes, es invisible. Pasado ese número, el usuario no puede elegir a un cliente que existe y **no hay ningún aviso**: el dropdown simplemente no lo lista. Con búsqueda asíncrona contra la base (un `ClientCombobox` que consulta al escribir) desaparece el techo sin agregar paginación a un `Select` nativo.

**6. Aggregate queries del dashboard.** Cuatro consultas separadas para los contadores, lanzadas en paralelo. A la escala de este dataset son lo correcto y más simples que una alternativa. Con volumen las cuatro se volverían el cuello de botella, y la respuesta es una consulta agrupada o un cache de corto plazo, no reescribir la página.

**7. Historial de migraciones.** `schema.sql` es un script aplastado e idempotente, correcto para partir de cero. En producción haría falta un directorio `supabase/migrations/` para que cada cambio sea versionado y reversible de forma independiente.

**8. Observabilidad y entrega continua.** Sin logging estructurado, sin reporte de errores, y sin CI. Como mínimo: un pipeline que corra `pnpm build`, `pnpm lint` y `pnpm exec tsc --noEmit` en cada push, más captura de errores en las Server Actions. Hoy un error en producción se descubre mirando el `console` del navegador de un usuario.

**Lo que NO cambiaría:** la estructura de rutas, la separación Server/Client Components, el estado del listado en la URL, ni el `PGRST116` como detección de fila desaparecida. Esa base aguantaría bien el crecimiento; lo anterior es lo que se suffre antes.

## Notas y trampas conocidas

- **`pnpm build` emite un warning de deprecación**: la convención de archivo `middleware` está deprecada en favor de `proxy` en Next 16. Es esperado y no rompe nada; el warning viene del propio `next` al detectar `src/middleware.ts`. Si se migra, `next` incluye el codemod, pero conviene hacerlo en un commit propio porque renombra el archivo.
- **No** hay flujo de signup. El usuario de Auth se crea desde el Dashboard; sin él, `/login` no tiene contra qué validarse.
- **No** se puede eliminar un cliente, por dos razones independientes. La política de borrado **no existe** sobre `public.clients`, así que PostgREST responde `42501` a cualquier llamada directa autenticada. Y aunque existiera, `shipments.client_id` usa `ON DELETE NO ACTION`: la FK bloquearía en vez de hacer cascada silenciosa sobre los embarques del cliente. El botón de la tabla está deshabilitado por una tercera razón más —no hay `deleteClientAction`—, pero esa es la que menos importa, porque un control de UI no es una garantía.
- **`"Cargando..."` está prohibido por la convención de UI del proyecto**: los estados de carga son skeletons, no texto.

## Estructura del proyecto

```
src/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── clientes/page.tsx
│   │   └── embarques/
│   │       ├── page.tsx
│   │       └── [id]/page.tsx
│   ├── actions/
│   │   ├── auth.ts
│   │   ├── clientes.ts
│   │   └── embarques.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── auth/
│   ├── clientes/
│   ├── dashboard/
│   ├── embarques/
│   ├── layout/
│   └── ui/
├── lib/
│   ├── supabase/        client.ts, server.ts, middleware.ts
│   ├── validations/     client.ts, shipment.ts
│   └── utils.ts
├── types/
│   └── database.ts
└── middleware.ts

supabase/
├── schema.sql
└── seed.sql
```