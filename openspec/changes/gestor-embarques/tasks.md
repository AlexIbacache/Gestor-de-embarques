# Tasks

## 1. Scaffolding del proyecto y dependencias

- [x] 1.1 Crear proyecto Next.js con App Router y TypeScript usando `npx create-next-app@latest ./` con `--ts --app --src-dir --tailwind --eslint`. Verificar que `npm run dev` inicia sin errores.
- [x] 1.2 Instalar dependencias: `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `motion`, `sonner`. Verificar que aparecen en `package.json`.
- [x] 1.3 Inicializar shadcn/ui con `npx shadcn@latest init`. Instalar componentes: Button, Input, Label, Card, Table, Dialog, AlertDialog, DropdownMenu, Select, Badge, Skeleton, Alert, Sheet, Separator, Tooltip. Verificar que los componentes existen en `src/components/ui/`.
- [x] 1.4 Configurar tipografía Inter desde Google Fonts en `src/app/layout.tsx`. Verificar que la fuente se aplica en el navegador.
- [x] 1.5 Crear archivo `.env.local.example` con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Crear `.env.local` con los mismos campos vacíos. Verificar que `.env.local` está en `.gitignore`.

## 2. Supabase: base de datos, RLS y auth

- [x] 2.1 Crear `supabase/schema.sql` con las sentencias CREATE TABLE para `clients` (id uuid PK default gen_random_uuid(), name text, email text, company text, created_at timestamptz default now()) y `shipments` (id uuid PK default gen_random_uuid(), reference text UNIQUE, client_id uuid FK → clients.id, origin text, destination text, modality text, status text, eta date, created_at timestamptz default now()). Verificar que el SQL es válido ejecutándolo en el editor SQL de Supabase.
- [x] 2.2 Agregar sentencias ALTER TABLE para habilitar RLS y CREATE POLICY para SELECT, INSERT, UPDATE, DELETE en ambas tablas, permitiendo solo cuando `auth.uid() IS NOT NULL`. Verificar que las políticas aparecen en el panel de Supabase.
- [x] 2.3 Crear `src/lib/supabase/server.ts` con `createServerClient` de `@supabase/ssr` usando `cookies()` de Next.js. Verificar que importa correctamente y compila sin errores.
- [x] 2.4 Crear `src/lib/supabase/client.ts` con `createBrowserClient` de `@supabase/ssr`. Verificar que compila sin errores.
- [x] 2.5 Crear `src/lib/supabase/middleware.ts` con la función helper que refresca la sesión de Supabase en el middleware. Verificar que exporta la función correctamente.

## 3. Tipos y validaciones

- [x] 3.1 Crear `src/types/database.ts` con los tipos TypeScript: `Client`, `Shipment`, `ShipmentModality` (FCL | LCL | AIR), `ShipmentStatus` (Pendiente | En tránsito | Entregado | Retrasado | Cancelado). Verificar que compila sin errores de tipo.
- [x] 3.2 Crear `src/lib/validations/client.ts` con el schema Zod `clientSchema` (name: string min 1, email: string email, company: string min 1). Verificar que valida correctamente datos válidos e inválidos.
- [x] 3.3 Crear `src/lib/validations/shipment.ts` con el schema Zod `shipmentSchema` (reference, client_id, origin, destination, modality enum, status enum, eta). Verificar que valida correctamente.
- [x] 3.4 Crear `src/lib/utils.ts` con utilidades compartidas (cn para class merging si shadcn no lo generó, formateadores de fecha). Verificar que las funciones exportan correctamente.

## 4. Autenticación y middleware

- [x] 4.1 Crear `src/middleware.ts` que intercepta rutas protegidas (matcher para dashboard, clientes, embarques), verifica sesión con Supabase y redirige a `/login` si no hay sesión. Si hay sesión y visita `/login`, redirigir a `/dashboard`. Verificar accediendo a `/dashboard` sin sesión → redirige a `/login`.
- [x] 4.2 Crear `src/app/(auth)/login/page.tsx` con formulario de login (email + password), usando Server Action para autenticar con Supabase Auth. Incluir validación con Zod, estados de loading (botón deshabilitado con "Iniciando sesión..."), y mensajes de error. Verificar que el login funciona con credenciales válidas.
- [x] 4.3 Crear Server Action `logout` que destruye la sesión y redirige a `/login`. Verificar que cerrar sesión funciona.

## 5. Layout y navegación

- [x] 5.1 Crear `src/app/(dashboard)/layout.tsx` como Server Component con la estructura: sidebar + área principal. Obtener datos del usuario autenticado en el servidor. Verificar que renderiza el layout con la información del usuario.
- [x] 5.2 Crear `src/components/layout/sidebar.tsx` con logo/nombre de la app, enlaces de navegación (Dashboard, Clientes, Embarques) con indicador de ruta activa, info del usuario y botón de cerrar sesión. Estilo: fondo blanco/gris claro, iconos, tipografía Inter, similar a la maqueta. Verificar que la navegación funciona y marca la ruta activa.
- [x] 5.3 Crear `src/components/layout/header.tsx` con campo de búsqueda rápida y nombre/email del usuario. Verificar que se renderiza en todas las páginas del dashboard.
- [x] 5.4 Crear `src/components/layout/mobile-nav.tsx` usando Sheet de shadcn para navegación móvil con hamburger menu. Mostrar solo en viewports mobile/tablet. Verificar que el menú se abre/cierra correctamente en mobile.
- [x] 5.5 Agregar animaciones de entrada con Motion al contenido principal del layout (fade in + slide up sutil). Verificar que la transición es visible pero no intrusiva.

## 6. Dashboard

- [x] 6.1 Crear `src/app/(dashboard)/dashboard/page.tsx` como Server Component que obtiene de Supabase: total de embarques, embarques en tránsito, embarques retrasados. Renderizar cards de estadísticas con los conteos. Verificar que los números coinciden con los datos en la base de datos.
- [x] 6.2 Agregar sección "Últimos embarques" al dashboard con los embarques más recientes (referencia, cliente, estado badge, fecha). Verificar que muestra los embarques ordenados por fecha descendente.
- [x] 6.3 Agregar estados de UX al dashboard: skeleton loading (usando Suspense + Skeleton de shadcn), estado vacío (cuando no hay embarques). Verificar que el skeleton aparece durante la carga.

## 7. CRUD de clientes

- [x] 7.1 Crear Server Actions en `src/app/actions/clientes.ts`: `createClient` y `updateClient`. Cada action debe verificar sesión, validar con Zod, ejecutar en Supabase y revalidar la ruta. Verificar que crear/editar un cliente persiste los datos correctamente.
- [x] 7.2 Crear `src/components/clientes/client-form.tsx` (Client Component) con Dialog de shadcn para crear/editar cliente. Campos: nombre, email, empresa. Validación client-side con Zod, estado de loading en botón de submit ("Guardando..."), toast de confirmación/error con Sonner. Verificar que el diálogo se abre, valida y envía correctamente.
- [x] 7.3 Crear `src/components/clientes/client-table.tsx` (Client Component para interactividad) con Table de shadcn. Columnas: Nombre, Email, Empresa, Creado, Acciones (editar). En mobile, transformar a cards. Verificar que la tabla se renderiza con datos y las cards aparecen en mobile.
- [x] 7.4 Crear `src/components/clientes/client-filters.tsx` (Client Component) con campo de búsqueda que actualiza `?search=` en la URL con debounce. Verificar que buscar actualiza la URL y filtra los resultados.
- [x] 7.5 Crear `src/app/(dashboard)/clientes/page.tsx` como Server Component que lee searchParams (search, sort, order, page), construye la consulta Supabase con WHERE ilike, ORDER BY y RANGE, y pasa los datos al componente tabla. Incluir paginación. Verificar que combinar búsqueda + ordenamiento + paginación funciona correctamente vía URL.
- [x] 7.6 Agregar estados de UX a la página de clientes: skeleton loading, estado vacío con botón "Crear cliente", estado de error con botón "Reintentar". Verificar que cada estado se muestra en su condición.

## 8. CRUD de embarques

- [x] 8.1 Crear Server Actions en `src/app/actions/embarques.ts`: `createShipment`, `updateShipment`, `deleteShipment`. Cada action verifica sesión, valida con Zod (excepto delete que valida el ID), ejecuta en Supabase y revalidar la ruta. Verificar que las tres operaciones persisten/eliminan correctamente.
- [x] 8.2 Crear `src/components/embarques/shipment-status-badge.tsx` con Badge de shadcn y colores diferenciados: Pendiente (amarillo/ámbar), En tránsito (azul), Entregado (verde), Retrasado (rojo), Cancelado (gris). Verificar que cada estado tiene un color visual distinto.
- [x] 8.3 Crear `src/components/embarques/shipment-form.tsx` (Client Component) con Dialog de shadcn para crear/editar embarque. Campos: referencia, cliente (Select con lista de clientes), origen, destino, modalidad (Select FCL/LCL/AIR), estado (Select), ETA (input date). Validación con Zod, loading state, toasts. Verificar que crear un embarque asocia correctamente el cliente.
- [x] 8.4 Crear `src/components/embarques/shipment-table.tsx` (Client Component) con Table de shadcn. Columnas: Referencia, Cliente, Origen, Destino, Modalidad, Estado (badge), ETA, Creado, Acciones (editar, eliminar). En mobile, transformar a cards. Verificar que muestra los datos incluyendo nombre del cliente.
- [x] 8.5 Crear `src/components/embarques/shipment-filters.tsx` (Client Component) con campo de búsqueda, Select para filtro de estado, Select para filtro de modalidad. Los filtros actualizan `?search=`, `?status=`, `?modality=` en la URL. Verificar que los filtros se combinan correctamente.
- [x] 8.6 Agregar AlertDialog de shadcn para confirmación de eliminación de embarques. Verificar que cancelar no elimina y confirmar sí elimina.
- [x] 8.7 Crear `src/app/(dashboard)/embarques/page.tsx` como Server Component que lee searchParams (search, status, modality, sort, order, page), construye la consulta Supabase con filtros, orden y paginación, incluye JOIN con clients para mostrar nombre. Verificar que la URL `/embarques?status=En%20tránsito&sort=eta&order=asc&page=2` funciona.
- [x] 8.8 Agregar estados de UX a la página de embarques: skeleton loading, estado vacío, estado de error. Verificar cada estado.

## 9. Detalle de embarque

- [x] 9.1 Crear `src/components/embarques/shipment-detail.tsx` que muestra: referencia, estado (badge), datos del cliente (nombre, email, empresa), ruta (origen → destino), modalidad, ETA, fecha de creación. Estilo con cards y layout limpio. Verificar que toda la información se muestra correctamente.
- [x] 9.2 Crear `src/app/(dashboard)/embarques/[id]/page.tsx` como Server Component que obtiene el embarque por ID con datos del cliente (JOIN). Incluir botón "Volver a embarques". Si el ID no existe, mostrar notFound(). Verificar con un ID válido y uno inválido.

## 10. Responsive, animaciones y datos de prueba

- [ ] 10.1 Revisar y ajustar el responsive de todas las páginas: sidebar oculta en mobile (Sheet), tablas transformadas a cards en mobile, filtros en Sheet/Drawer en mobile, botones accesibles. Verificar en viewport de 375px, 768px y 1280px.
- [x] 10.2 Agregar animaciones con Motion: fade-in + slide-up en cards, aparición de filas de tabla, transición de dialogs. Las animaciones deben ser sutiles (opacity 0→1, y 10→0). Verificar que las animaciones son visibles pero no distraen.
- [x] 10.3 Crear `supabase/seed.sql` con INSERT de 15 clientes y 40 embarques distribuidos entre las tres modalidades y los cinco estados. Documentar en el README cómo ejecutar el seed. Verificar que los datos aparecen correctamente en la aplicación.
- [x] 10.4 Crear `README.md` con: descripción del proyecto, stack tecnológico, instrucciones de instalación, configuración de Supabase (tablas, RLS, seed), variables de entorno, comando de ejecución, y decisiones de arquitectura. Verificar que un desarrollador puede seguir el README para instalar el proyecto desde cero.
