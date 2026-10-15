# Proposal

## Why

Se necesita una aplicación web full stack para gestionar clientes y embarques logísticos. El sistema debe permitir crear, visualizar, editar y eliminar registros, con autenticación, seguridad a nivel de base de datos (RLS), SSR, y una interfaz moderna y responsive. Es un proyecto greenfield que se construye desde cero.

## What Changes

- Crear un proyecto Next.js con App Router, TypeScript, Tailwind CSS, shadcn/ui, Motion y Zod.
- Configurar Supabase como backend: autenticación (email + password), PostgreSQL y Row Level Security.
- Implementar middleware de protección de rutas.
- Construir un layout con sidebar (desktop) y navegación móvil.
- Implementar CRUD completo de clientes (crear, editar, listar).
- Implementar CRUD completo de embarques (crear, editar, eliminar, listar, detalle).
- Implementar búsqueda, filtros, ordenamiento y paginación con URL search params.
- Validación server-side con Zod en todas las Server Actions.
- Dashboard con estadísticas básicas y últimos embarques.
- Estados de UX: loading (skeletons), empty, error, y feedback con toasts.
- Diseño responsive para desktop, tablet y mobile.
- Animaciones moderadas con Motion.
- Seed de datos de prueba (10-20 clientes, 30-50 embarques).
- Estilo visual inspirado en la maqueta de referencia: interfaz limpia, sidebar con fondo claro, cards con estadísticas, tipografía moderna.

## Capabilities

### New Capabilities

- `auth`: Autenticación con Supabase Auth (email + password), login/logout, middleware de protección de rutas.
- `clients`: Gestión de clientes — CRUD (crear, editar), listado con búsqueda, ordenamiento y paginación.
- `shipments`: Gestión de embarques — CRUD completo (crear, editar, eliminar), listado con búsqueda, filtros por estado/modalidad, ordenamiento, paginación y vista de detalle.
- `dashboard`: Panel principal con estadísticas resumidas (total embarques, en tránsito, retrasados) y listado de últimos embarques.
- `layout`: Layout compartido con sidebar, header, navegación móvil y diseño responsive.

### Modified Capabilities

_(Sin capacidades existentes para modificar — proyecto greenfield.)_

## Impact

- **Código**: Proyecto completo desde cero bajo `src/` con la estructura definida en la arquitectura.
- **Dependencias**: Next.js, TypeScript, Tailwind CSS, shadcn/ui, Motion (framer-motion), Zod, @supabase/ssr, @supabase/supabase-js, sonner.
- **Infraestructura**: Requiere un proyecto en Supabase con las tablas `clients` y `shipments`, políticas RLS, y credenciales configuradas en variables de entorno.
- **APIs**: Sin API REST externa — todo se maneja con Server Components y Server Actions.
- **Deploy**: Preparado para Vercel u otro hosting compatible con Next.js.
