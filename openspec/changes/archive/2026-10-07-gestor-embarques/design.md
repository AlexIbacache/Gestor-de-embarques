# Design

## Context

Proyecto greenfield. Ver proposal.md para motivación y alcance. Las specs definen el contrato de comportamiento para auth, clients, shipments, dashboard y layout.

La maqueta de referencia (`assets/diseño.png`) muestra una aplicación tipo dashboard financiero con: sidebar izquierda con fondo claro, header con búsqueda y usuario, área principal con cards de estadísticas y gráficos, diseño limpio con tipografía moderna. Se adapta este estilo al dominio de logística/embarques.

Restricciones del documento de arquitectura (`arquitectura_gestor_embarques.md`):
- Server Components por defecto, Client Components solo cuando sean necesarios.
- No crear capas de abstracción innecesarias (controllers, services, repositories, etc.).
- Consultas eficientes en Supabase (no filtrar en JS).
- URL search params como fuente de verdad para filtros/búsqueda/paginación.

## Goals / Non-Goals

**Goals:**
- Implementar una aplicación funcional y completa siguiendo la arquitectura definida.
- UI limpia e inspirada en la maqueta: sidebar clara, cards con estadísticas, tipografía moderna (Inter/Outfit).
- SSR real: datos iniciales desde Server Components, no desde `useEffect`.
- Seguridad en profundidad: middleware + RLS + validación server-side.
- Responsive funcional en los tres breakpoints.

**Non-Goals:**
- Gráficos complejos (charts avanzados, donut charts como en la maqueta financiera).
- Gestión de roles o permisos granulares más allá de "usuario autenticado".
- API REST pública.
- Internacionalización (la UI es solo en español).
- Tests automatizados (no mencionados en los requisitos).

## Decisions

### 1. Next.js App Router con estructura plana

**Decisión**: Usar la estructura de carpetas definida en la arquitectura: `src/app/`, route groups `(auth)` y `(dashboard)`, Server Actions en `src/app/actions/`.

**Alternativas consideradas**:
- Route handlers (`/api/`) → Descartado. Server Actions son suficientes para las operaciones de escritura y simplifican el flujo.
- Capas service/repository → Descartado por instrucción explícita de la arquitectura. Las consultas a Supabase van directamente en Server Components y Server Actions.

**Rationale**: Minimalismo intencional. El proyecto no justifica capas intermedias.

### 2. Supabase client: server vs client

**Decisión**: Dos clientes Supabase:
- `lib/supabase/server.ts` → Usa `@supabase/ssr` con `cookies()` de Next.js. Para Server Components y Server Actions.
- `lib/supabase/client.ts` → Usa `createBrowserClient`. Solo para Client Components que necesiten escuchar cambios de auth en tiempo real.

**Rationale**: `@supabase/ssr` es la forma oficial de manejar auth con SSR en Next.js App Router. Evita problemas de sincronización de sesión entre servidor y cliente.

### 3. Middleware para protección de rutas

**Decisión**: `src/middleware.ts` intercepta todas las rutas protegidas, verifica sesión con Supabase y redirige a `/login` si no hay sesión. Matcher: `/(dashboard|clientes|embarques)(.*)`.

**Alternativas consideradas**:
- Layout-level auth check → No previene acceso a la ruta; el middleware sí lo hace a nivel de request.

### 4. RLS como capa de seguridad de base de datos

**Decisión**: Políticas RLS en ambas tablas que permiten SELECT, INSERT, UPDATE, DELETE solo cuando `auth.uid()` no es null. Es una capa de defensa complementaria al middleware y la validación en Server Actions.

**SQL conceptual**:
```sql
CREATE POLICY "Users can read clients" ON clients
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert clients" ON clients
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
-- Análogo para UPDATE, DELETE en ambas tablas
```

### 5. URL search params como fuente de verdad

**Decisión**: Los filtros, búsqueda, ordenamiento y página se representan como query params en la URL. Los Server Components leen `searchParams` y construyen la consulta Supabase.

**Rationale**: URL reproducible, compatible con SSR, soporta back/forward del navegador, estado compartible.

### 6. Validación dual con Zod

**Decisión**: Los schemas Zod se definen una vez en `src/lib/validations/` y se usan tanto para validación client-side (UX) como server-side (seguridad) en Server Actions.

**Schemas**:
- `clientSchema`: name (string, min 1), email (string, email), company (string, min 1)
- `shipmentSchema`: reference (string, min 1), client_id (uuid), origin (string, min 1), destination (string, min 1), modality (enum FCL|LCL|AIR), status (enum 5 valores), eta (string/date)

### 7. UI con shadcn/ui + Tailwind CSS

**Decisión**: shadcn/ui para todos los componentes de interfaz (Table, Dialog, Button, Card, Badge, etc.). Tailwind CSS para estilos custom. Motion (framer-motion) para animaciones sutiles.

**Estilo visual** (inspirado en la maqueta):
- Fondo general claro, sidebar con fondo blanco/gris muy claro.
- Cards con bordes sutiles y sombras suaves.
- Tipografía: Inter o Outfit desde Google Fonts.
- Paleta: tonos neutros con acentos en verde oliva/negro para acciones primarias (similar a la maqueta).
- Badges con colores diferenciados por estado.

### 8. Feedback con Sonner

**Decisión**: Usar `sonner` (compatible con shadcn) para toasts. Se invoca después de cada Server Action exitosa o fallida.

### 9. Datos de prueba con seed SQL

**Decisión**: Archivo `supabase/seed.sql` con INSERT statements para 15 clientes y 40 embarques distribuidos entre modalidades y estados. Se documenta en el README.

**Alternativa**: Script de seed con el SDK → Más complejo de mantener y requiere credenciales de servicio.

## Risks / Trade-offs

- **[Dependencia de Supabase]** → La aplicación está acoplada a Supabase Auth y al cliente JS de Supabase. Migrar a otro proveedor requeriría reescribir auth y data layer. *Mitigación*: Es el stack requerido; el acoplamiento es aceptable para este alcance.
- **[RLS permisiva]** → Las políticas permiten a CUALQUIER usuario autenticado operar sobre TODOS los registros (no hay multi-tenancy). *Mitigación*: Correcto para el alcance actual. Si se necesita multi-tenancy, se agregan columnas `user_id` y políticas `USING (auth.uid() = user_id)`.
- **[Sin tests]** → No se implementan tests automatizados. *Mitigación*: Las specs con scenarios sirven como guía de testing manual. Se puede agregar testing como cambio separado.
- **[Paginación con offset]** → Supabase `.range()` usa offset-based pagination, que pierde rendimiento con volúmenes altos. *Mitigación*: Aceptable para el volumen esperado (< 100 registros). Para escalar, migrar a cursor-based.
