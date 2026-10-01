# Arquitectura y Plan de Implementación — Gestor de Embarques

## 1. Objetivo

Aplicación web full stack para gestionar clientes y embarques.

### Stack obligatorio

- Next.js
- TypeScript
- Supabase
- SSR
- Tailwind CSS (versión estable más reciente)
- shadcn/ui
- Motion
- Zod

### Principio general

Mantener una arquitectura **simple, clara y escalable**, evitando sobrearquitectura.

> **Server Components por defecto. Client Components solamente cuando sean necesarios.**

---

# 2. Arquitectura general

```text
Next.js App Router
│
├── Server Components
│   └── Obtención y renderizado inicial de datos
│
├── Client Components
│   └── Interactividad, formularios, filtros, dialogs, animaciones
│
├── Server Actions
│   └── Crear / editar / eliminar
│
├── Zod
│   └── Validación de datos
│
└── Supabase
    ├── Authentication
    ├── PostgreSQL
    └── Row Level Security (RLS)
```

### Flujo de datos

```text
Browser
   │
   ▼
Next.js
   │
   ├── Server Component ──► Supabase
   │
   ├── Client Component
   │       │
   │       ▼
   │   Server Action
   │       │
   │       ▼
   │    Zod + Auth
   │       │
   │       ▼
   │    Supabase
   │
   └── RLS protege los datos
```

---

# 3. Estructura de carpetas

```text
src/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   │
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   │
│   │   ├── clientes/
│   │   │   └── page.tsx
│   │   │
│   │   └── embarques/
│   │       ├── page.tsx
│   │       └── [id]/
│   │           └── page.tsx
│   │
│   ├── actions/
│   │   ├── clientes.ts
│   │   └── embarques.ts
│   │
│   ├── globals.css
│   └── layout.tsx
│
├── components/
│   ├── ui/
│   │
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   └── mobile-nav.tsx
│   │
│   ├── clientes/
│   │   ├── client-form.tsx
│   │   ├── client-table.tsx
│   │   └── client-filters.tsx
│   │
│   └── embarques/
│       ├── shipment-form.tsx
│       ├── shipment-table.tsx
│       ├── shipment-filters.tsx
│       ├── shipment-status-badge.tsx
│       └── shipment-detail.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── server.ts
│   │   ├── client.ts
│   │   └── middleware.ts
│   │
│   ├── validations/
│   │   ├── client.ts
│   │   └── shipment.ts
│   │
│   └── utils.ts
│
├── types/
│   └── database.ts
│
└── middleware.ts
```

## Regla

No crear capas innecesarias como:

```text
controllers/
services/
repositories/
factories/
adapters/
use-cases/
```

salvo que una necesidad real del proyecto lo justifique.

---

# 4. Modelo de datos

## Tabla `clients`

```text
clients
--------------------------------
id              uuid PK
name            text
email           text
company         text
created_at      timestamptz
```

## Tabla `shipments`

```text
shipments
--------------------------------
id              uuid PK
reference       text UNIQUE
client_id       uuid FK → clients.id
origin          text
destination     text
modality        text
status          text
eta             date
created_at      timestamptz
```

## Relación

```text
CLIENT
  │
  │ 1
  │
  │ N
  ▼
SHIPMENTS
```

Un cliente puede tener muchos embarques.

---

# 5. Tipos principales

## Modalidades

```ts
type ShipmentModality =
  | "FCL"
  | "LCL"
  | "AIR";
```

## Estados

```ts
type ShipmentStatus =
  | "Pendiente"
  | "En tránsito"
  | "Entregado"
  | "Retrasado"
  | "Cancelado";
```

Evitar `any`.

---

# 6. Autenticación

Utilizar:

```text
Supabase Auth
```

Método inicial:

```text
Email + Password
```

## Ruta pública

```text
/login
```

## Rutas protegidas

```text
/dashboard
/clientes
/embarques
```

El middleware debe comprobar la sesión.

---

# 7. Seguridad

La seguridad debe existir tanto en la aplicación como en la base de datos.

## Reglas

- Todas las rutas privadas requieren autenticación.
- Las Server Actions deben comprobar la sesión.
- Validar datos en servidor con Zod.
- Usar Row Level Security (RLS) en Supabase.
- No confiar en restricciones únicamente del frontend.
- No confiar en botones ocultos para proteger operaciones.
- Validar identificadores y parámetros recibidos.
- Nunca exponer secretos en Client Components.
- Nunca colocar `service_role` en el navegador.
- Utilizar variables de entorno.
- Las operaciones deben ser rechazadas si el usuario no tiene autorización.

## Variables de entorno

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

Los secretos privilegiados, si fueran necesarios, solamente deben utilizarse del lado servidor.

---

# 8. SSR / Server Components

## Regla principal

Usar Server Components por defecto.

Las páginas deben obtener sus datos inicialmente desde el servidor.

Ejemplo conceptual:

```tsx
export default async function ShipmentsPage() {
  const shipments = await getShipments();

  return (
    <ShipmentTable shipments={shipments} />
  );
}
```

Evitar utilizar `useEffect()` para cargar inicialmente todos los datos del listado si estos pueden obtenerse directamente en el servidor.

## Server Components

Usar para:

- páginas
- layouts
- listados iniciales
- detalles
- consultas a Supabase
- contenido que no necesita estado del navegador

## Client Components

Usar solamente cuando sea necesario:

- formularios
- inputs interactivos
- filtros
- dialogs
- dropdowns
- confirmaciones
- estado local
- Motion
- interacciones específicas del navegador

---

# 9. Server Actions

Las operaciones de escritura se manejarán mediante Server Actions.

```text
src/app/actions/
├── clientes.ts
└── embarques.ts
```

## Flujo

```text
Formulario
    │
    ▼
Server Action
    │
    ├── comprobar sesión
    ├── validar con Zod
    ├── validar permisos
    ├── ejecutar operación en Supabase
    └── revalidar la página
```

Operaciones:

### Clientes

```text
CREATE
UPDATE
```

### Embarques

```text
CREATE
UPDATE
DELETE
```

---

# 10. Validación con Zod

Schemas:

```text
src/lib/validations/
├── client.ts
└── shipment.ts
```

Ejemplo conceptual:

```ts
const shipmentSchema = z.object({
  reference: z.string().min(1),
  origin: z.string().min(1),
  destination: z.string().min(1),
  modality: z.enum(["FCL", "LCL", "AIR"]),
  status: z.enum([
    "Pendiente",
    "En tránsito",
    "Entregado",
    "Retrasado",
    "Cancelado",
  ]),
  eta: z.string(),
});
```

### Regla importante

La validación del frontend mejora la UX.

La validación del servidor protege la aplicación.

Nunca confiar únicamente en la validación del navegador.

---

# 11. Listados

Los listados deben soportar:

- búsqueda
- filtros
- ordenamiento
- paginación

Esto debe funcionar de forma combinada.

Ejemplo:

```text
/embarques?
search=MSC
&status=En%20tránsito
&sort=eta
&order=asc
&page=2
```

## URL Search Params

Utilizar parámetros de URL para representar:

```text
search
filter
sort
order
page
```

### Ventajas

- URL reproducible
- navegación con back/forward
- estado compartible
- SSR
- consultas directamente en servidor
- no depender de un estado global

---

# 12. Consultas a Supabase

No descargar todos los registros para filtrarlos en JavaScript.

La búsqueda, filtros, ordenamiento y paginación deben realizarse en la consulta a PostgreSQL siempre que sea posible.

Conceptualmente:

```text
URL params
    │
    ▼
Server Component
    │
    ▼
Supabase query
    │
    ├── WHERE
    ├── ORDER BY
    └── RANGE / pagination
    │
    ▼
Resultados
```

---

# 13. Clientes

Página:

```text
/clientes
```

Debe permitir:

- visualizar clientes
- crear cliente
- editar cliente
- buscar cliente
- ordenar
- paginar

## Interfaz

Desktop:

```text
Clientes

[Buscar...]                    [+ Crear cliente]

┌────────────────────────────────────────────┐
│ Nombre │ Email │ Empresa │ Creado │ Acción │
├────────────────────────────────────────────┤
│ ...                                         │
└────────────────────────────────────────────┘

                    < 1 2 3 >
```

Mobile:

Transformar la información en cards para mantener buena usabilidad.

---

# 14. Embarques

Página:

```text
/embarques
```

Debe permitir:

- visualizar embarques
- crear embarque
- editar embarque
- eliminar embarque
- buscar
- filtrar
- ordenar
- paginar
- acceder al detalle

## Información visible

```text
Referencia
Cliente
Origen
Destino
Modalidad
Estado
ETA
Fecha creación
```

El cliente debe ser fácilmente identificable.

---

# 15. Detalle de embarque

Ruta:

```text
/embarques/[id]
```

Debe mostrar:

```text
Referencia
Cliente
Email del cliente
Empresa
Origen
Destino
Modalidad
Estado
ETA
Fecha de creación
```

Diseño conceptual:

```text
← Volver a embarques

REF-2026-001
[En tránsito]

Cliente
ACME Logistics
contacto@acme.com

Ruta
Santiago → Miami

Modalidad
FCL

ETA
15 Oct 2026
```

---

# 16. Dashboard

El dashboard puede ser simple.

Ruta:

```text
/dashboard
```

Se pueden incluir estadísticas básicas:

```text
┌──────────────┐
│ Embarques    │
│ 128          │
└──────────────┘

┌──────────────┐
│ En tránsito  │
│ 74           │
└──────────────┘

┌──────────────┐
│ Retrasados   │
│ 8            │
└──────────────┘
```

También:

```text
Últimos embarques
```

No implementar gráficos complejos si el tiempo es limitado.

---

# 17. UI / shadcn

Utilizar componentes de shadcn/ui para mantener consistencia.

Componentes recomendados:

```text
Button
Input
Label
Card
Table
Dialog
AlertDialog
DropdownMenu
Select
Badge
Skeleton
Alert
Sheet
Separator
Tooltip
```

## Uso

### Dialog

```text
Crear cliente
Editar cliente
Crear embarque
Editar embarque
```

### AlertDialog

```text
Confirmar eliminación
```

### Badge

```text
Pendiente
En tránsito
Entregado
Retrasado
Cancelado
```

---

# 18. Estados de UX

Cada página/operación importante debe considerar:

```text
Loading
Success
Empty
Error
Operation in progress
```

## Loading

Utilizar Skeletons.

No mostrar solamente:

```text
"Cargando..."
```

Ejemplo:

```text
████████████████
██████████
██████████████
```

## Empty

```text
No hay embarques

Aún no se han registrado embarques.

[Crear embarque]
```

## Error

```text
No pudimos cargar los embarques.

[Intenta nuevamente]
```

## Operaciones

Los botones deben mostrar estado mientras se procesa una acción.

Ejemplo:

```text
[Guardando...]
```

Evitar múltiples envíos accidentales.

---

# 19. Feedback

Las acciones importantes deben proporcionar feedback claro.

Ejemplos:

```text
Cliente creado correctamente.
Embarque actualizado correctamente.
Embarque eliminado correctamente.
No fue posible eliminar el embarque.
```

Utilizar Toast/Sonner u otra solución compatible con shadcn.

---

# 20. Motion

Utilizar Motion de forma moderada.

Objetivo:

- transiciones suaves
- aparición de contenido
- dialogs
- cards
- feedback visual

Evitar animar absolutamente todo.

Ejemplo:

```text
opacity: 0 → 1
y: 10 → 0
```

Las animaciones deben mejorar la experiencia, no distraer.

---

# 21. Responsive

Debe funcionar correctamente en:

```text
Desktop
Tablet
Mobile
```

## Desktop

Sidebar visible.

Tabla completa.

## Tablet

Adaptar espacios y columnas.

## Mobile

Utilizar:

- navegación móvil
- cards
- botones accesibles
- filtros mediante Sheet/Drawer
- información priorizada

Evitar simplemente reducir el tamaño de una tabla desktop.

## Regla

No debe existir:

- overflow horizontal innecesario
- espacios vacíos excesivos
- botones demasiado pequeños
- contenido ilegible
- tablas imposibles de utilizar en móvil

---

# 22. Navegación

Desktop:

```text
┌──────────────┐
│ Logo         │
│              │
│ Dashboard    │
│ Clientes     │
│ Embarques    │
│              │
│              │
│ Usuario      │
│ Cerrar sesión│
└──────────────┘
```

Mobile:

```text
┌──────────────────────┐
│ ☰   Embarques    👤 │
└──────────────────────┘
```

---

# 23. Datos de prueba

Crear suficientes datos para demostrar:

### Clientes

Al menos:

```text
10-20 clientes
```

### Embarques

Al menos:

```text
30-50 embarques
```

Distribuir los datos entre:

```text
FCL
LCL
AIR
```

y:

```text
Pendiente
En tránsito
Entregado
Retrasado
Cancelado
```

Esto permite probar:

- filtros
- búsqueda
- paginación
- ordenamiento
- estados
- relaciones

---

# 24. Prioridad de implementación

Si solamente existe un día:

## Prioridad crítica

```text
1. Crear proyecto
2. Supabase
3. Base de datos
4. RLS
5. Auth
6. Middleware
7. Layout
8. CRUD clientes
9. CRUD embarques
10. SSR
```

## Prioridad alta

```text
11. Búsqueda
12. Filtros
13. Ordenamiento
14. Paginación
15. Detalle de embarque
16. Skeletons
17. Error states
18. Empty states
19. Feedback
20. Responsive
```

## Prioridad media

```text
21. Motion
22. Dashboard con estadísticas
23. Pulido visual
```

## Prioridad baja

```text
24. Gráficos complejos
25. Funcionalidades no solicitadas
26. Arquitectura avanzada
```

No sacrificar:

```text
Seguridad
SSR
CRUD
RLS
Validación
Responsive
```

por funcionalidades secundarias.

---

# 25. Orden de construcción recomendado

```text
FASE 1
├── Crear proyecto
├── Instalar dependencias
└── Configurar variables de entorno

FASE 2
├── Crear tablas
├── Relaciones
├── Índices necesarios
└── RLS

FASE 3
├── Supabase Auth
├── Login
└── Middleware

FASE 4
├── Dashboard layout
├── Sidebar
├── Header
└── Mobile navigation

FASE 5
├── Clientes
│   ├── Listado
│   ├── Crear
│   └── Editar
│
└── Embarques
    ├── Listado
    ├── Crear
    ├── Editar
    ├── Eliminar
    └── Detalle

FASE 6
├── Búsqueda
├── Filtros
├── Ordenamiento
└── Paginación

FASE 7
├── Skeletons
├── Empty states
├── Error states
├── Toasts
└── Loading buttons

FASE 8
├── Responsive
└── Mobile UX

FASE 9
├── Motion
└── Pulido visual

FASE 10
├── Datos de prueba
├── README
├── .env.example
└── Deploy
```

---

# 26. Checklist final

## Funcionalidad

- [ ] Login funciona
- [ ] Logout funciona
- [ ] Rutas protegidas
- [ ] Clientes se pueden listar
- [ ] Clientes se pueden crear
- [ ] Clientes se pueden editar
- [ ] Embarques se pueden listar
- [ ] Embarques se pueden crear
- [ ] Embarques se pueden editar
- [ ] Embarques se pueden eliminar
- [ ] Detalle de embarque funciona
- [ ] Cliente aparece asociado al embarque

## Listados

- [ ] Búsqueda
- [ ] Filtros
- [ ] Ordenamiento
- [ ] Paginación
- [ ] Se pueden combinar
- [ ] Estado se mantiene en URL

## SSR

- [ ] Datos iniciales obtenidos en servidor
- [ ] Server Components utilizados
- [ ] Client Components solamente cuando son necesarios
- [ ] No cargar todo mediante useEffect

## Seguridad

- [ ] Auth
- [ ] Middleware
- [ ] RLS
- [ ] Validación server-side
- [ ] Zod
- [ ] No exponer secretos
- [ ] No usar service_role en cliente
- [ ] Server Actions verifican sesión
- [ ] Operaciones protegidas ante requests manipuladas

## UX

- [ ] Skeletons
- [ ] Loading states
- [ ] Error states
- [ ] Empty states
- [ ] Toasts
- [ ] Confirmación de eliminación
- [ ] Botones deshabilitados durante operaciones

## Responsive

- [ ] Desktop
- [ ] Tablet
- [ ] Mobile
- [ ] Navegación móvil
- [ ] Tablas/cards adaptadas
- [ ] Sin overflow innecesario
- [ ] Sin espacios vacíos importantes

## Diseño

- [ ] Interfaz consistente
- [ ] Jerarquía visual clara
- [ ] Estados mediante badges
- [ ] Espaciado consistente
- [ ] Motion moderado

## Entrega

- [ ] README
- [ ] Instalación desde cero documentada
- [ ] `.env.example`
- [ ] Configuración de Supabase documentada
- [ ] Modelo de datos documentado
- [ ] Seguridad documentada
- [ ] Datos de prueba
- [ ] Repositorio Git
- [ ] Deploy funcionando

---

# 27. Reglas para trabajar con una IA

Cuando se utilice una IA para implementar funcionalidades:

1. Respetar esta arquitectura.
2. No introducir dependencias innecesarias.
3. No crear capas de arquitectura innecesarias.
4. No convertir componentes Server en Client Components sin necesidad.
5. No utilizar `any` salvo una razón justificada.
6. Validar entradas con Zod.
7. Las operaciones de escritura deben ejecutarse de forma segura en servidor.
8. No confiar en validaciones exclusivamente del frontend.
9. No saltarse RLS.
10. No exponer secretos.
11. Mantener búsqueda, filtros, ordenamiento y paginación en URL Search Params.
12. Utilizar consultas eficientes en Supabase.
13. Mantener los componentes pequeños y con una responsabilidad clara.
14. Reutilizar componentes de shadcn/ui.
15. Usar Motion de manera moderada.
16. Mantener responsive desktop/tablet/mobile.
17. Agregar estados de loading, error y empty cuando corresponda.
18. Antes de crear una nueva abstracción, comprobar si realmente es necesaria.

## Regla principal

> **No agregar complejidad solamente para que el proyecto parezca más profesional. La calidad debe venir de decisiones simples, correctas y fáciles de mantener.**

---

# 28. Decisiones técnicas para el README

La aplicación puede describirse con esta arquitectura:

> La aplicación utiliza Next.js App Router y una arquitectura basada principalmente en Server Components para la obtención y renderizado inicial de datos. Los Client Components se utilizan únicamente en las partes que requieren interactividad, como formularios, filtros y dialogs. Las operaciones de escritura se gestionan mediante Server Actions y validación con Zod. Supabase se utiliza para autenticación y persistencia PostgreSQL, utilizando Row Level Security para reforzar las restricciones de acceso a nivel de base de datos. Los filtros, búsqueda, ordenamiento y paginación se representan mediante parámetros de URL para mantener el estado de navegación reproducible y permitir que las consultas se ejecuten en el servidor.

---

# 29. Principio final

La aplicación debe sentirse como un pequeño producto real:

```text
              ┌───────────────────┐
              │     Next.js       │
              │   App Router      │
              └─────────┬─────────┘
                        │
                Server Components
                        │
                        ▼
              ┌───────────────────┐
              │   Server Actions │
              │      + Zod       │
              └─────────┬─────────┘
                        │
                        ▼
              ┌───────────────────┐
              │     Supabase      │
              │ Auth + PostgreSQL │
              │       + RLS       │
              └───────────────────┘
```

**Prioridad:**

```text
Correctitud
    ↓
Seguridad
    ↓
Funcionalidad
    ↓
SSR / rendimiento
    ↓
UX
    ↓
Responsive
    ↓
Animaciones / pulido
```
