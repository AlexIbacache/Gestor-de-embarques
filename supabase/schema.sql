-- =============================================================================
-- Gestor de Embarques — Esquema de base de datos
-- =============================================================================
-- Ejecutar en el editor SQL de Supabase (o `supabase db push`).
-- El script es idempotente: se puede volver a ejecutar sin errores.
--
-- Decisiones documentadas:
--   * NOT NULL en todas las columnas de negocio. Las Server Actions ya validan
--     con Zod, pero la base de datos no debe depender de esa validación.
--   * ON DELETE NO ACTION (default) en la FK shipments.client_id. La app sí
--     permite eliminar clientes, pero la FK bloquea el borrado de un cliente que
--     todavía tiene embarques, en vez de eliminarlos en cascada de forma
--     silenciosa.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabla: clients
-- -----------------------------------------------------------------------------
create table if not exists public.clients (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  company    text not null,
  created_at timestamptz default now()
);

comment on table public.clients is 'Clientes de la operación logística.';

-- Índices para los ordenamientos y búsquedas más frecuentes del listado.
create index if not exists clients_name_idx      on public.clients (name);
create index if not exists clients_company_idx   on public.clients (company);
create index if not exists clients_created_at_idx on public.clients (created_at desc);

-- -----------------------------------------------------------------------------
-- Tabla: shipments
-- -----------------------------------------------------------------------------
create table if not exists public.shipments (
  id          uuid primary key default gen_random_uuid(),
  reference   text not null unique,
  client_id   uuid not null references public.clients (id),
  origin      text not null,
  destination text not null,
  modality    text not null,
  status      text not null,
  eta         date not null,
  created_at  timestamptz default now()
);

comment on table public.shipments is 'Embarques logísticos asociados a un cliente.';

-- Índices: FK, filtros de listado y ordenamientos.
create index if not exists shipments_client_id_idx  on public.shipments (client_id);
create index if not exists shipments_status_idx     on public.shipments (status);
create index if not exists shipments_modality_idx   on public.shipments (modality);
create index if not exists shipments_eta_idx        on public.shipments (eta);
create index if not exists shipments_created_at_idx on public.shipments (created_at desc);

-- -----------------------------------------------------------------------------
-- Integridad de dominio (decisión D17)
-- -----------------------------------------------------------------------------
-- CHECK en lugar de enums de Postgres: agregar un valor no exige ALTER TYPE y la
-- aplicación ya versiona las listas en `src/lib/domain/shipments.ts` (fuente
-- única de verdad, decisión D18). Los literales de abajo son IDÉNTICOS a ese
-- módulo:
--   estados     → Pendiente, En tránsito, Entregado, Retrasado, Cancelado
--   modalidades → FCL, LCL, AIR
--
-- Este archivo es la ruta de INSTALACIÓN LIMPIA. Para una base ya existente usar
-- el script idempotente `supabase/migrations/20261015_hardening.sql`, que crea
-- estos constraints como NOT VALID y los valida tras revisar filas conflictivas.
--
-- Idempotencia: `drop ... if exists` + `add` permite re-ejecutar el archivo sin
-- error. Cada `add` valida de inmediato; si hubiera datos fuera de dominio, el
-- error señala exactamente qué constraint falla.
-- -----------------------------------------------------------------------------

alter table public.shipments drop constraint if exists shipments_status_check;
alter table public.shipments
  add constraint shipments_status_check
  check (
    status in ('Pendiente', 'En tránsito', 'Entregado', 'Retrasado', 'Cancelado')
  );

alter table public.shipments drop constraint if exists shipments_modality_check;
alter table public.shipments
  add constraint shipments_modality_check
  check (modality in ('FCL', 'LCL', 'AIR'));

-- Longitudes máximas razonables por columna de texto de negocio.
alter table public.clients drop constraint if exists clients_name_length_check;
alter table public.clients
  add constraint clients_name_length_check
  check (char_length(name) <= 120);

alter table public.clients drop constraint if exists clients_email_length_check;
alter table public.clients
  add constraint clients_email_length_check
  check (char_length(email) <= 254);

alter table public.clients drop constraint if exists clients_company_length_check;
alter table public.clients
  add constraint clients_company_length_check
  check (char_length(company) <= 160);

alter table public.shipments drop constraint if exists shipments_reference_length_check;
alter table public.shipments
  add constraint shipments_reference_length_check
  check (char_length(reference) <= 60);

alter table public.shipments drop constraint if exists shipments_origin_length_check;
alter table public.shipments
  add constraint shipments_origin_length_check
  check (char_length(origin) <= 120);

alter table public.shipments drop constraint if exists shipments_destination_length_check;
alter table public.shipments
  add constraint shipments_destination_length_check
  check (char_length(destination) <= 120);

-- Sanidad de fecha: `eta` es un `date` (fecha de calendario, no un instante). El
-- rango es amplio pero plausible operativamente: descarta años absurdos (1850,
-- 3000) sin bloquear una ETA real.
alter table public.shipments drop constraint if exists shipments_eta_range_check;
alter table public.shipments
  add constraint shipments_eta_range_check
  check (eta >= date '2000-01-01' and eta <= date '2100-12-31');

-- Auditoría de las garantías ya presentes en el esquema (no se recrean aquí):
--   * `shipments.client_id references public.clients (id)` usa ON DELETE NO
--     ACTION (el default): borrar un cliente con embarques falla con `23503` y
--     NUNCA elimina embarques en cascada.
--   * `shipments.reference` conserva su unicidad (`unique`) — `reference_dup` en
--     la tabla implica violación de unicidad `23505`.
--   * Todas las columnas de negocio de `clients` y `shipments` son NOT NULL.

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
-- Defensa en profundidad: el middleware protege las rutas y las Server Actions
-- verifican la sesión, pero la base de datos tampoco confía en la aplicación.
-- Sin un JWT válido (auth.uid() IS NULL) ninguna política concede acceso.
--
-- Nota de alcance: las políticas son permisivas para cualquier usuario
-- autenticado. No hay multi-tenancy; ver design.md § "RLS permisiva".
-- -----------------------------------------------------------------------------
alter table public.clients   enable row level security;
alter table public.shipments enable row level security;

-- clients -------------------------------------------------------------------
-- Los clientes ahora permiten borrado porque la UI lo expone: la tabla ofrece
-- un `DeleteClientDialog` conectado a `deleteClientAction`, y la base de datos
-- concede exactamente lo que la app ofrece. Una capacidad no debe depender de
-- la ausencia de un control visible: con la política de borrado presente,
-- PostgREST acepta la operación para cualquier llamador autenticado, y la capa
-- de actions no es lo único que separa un JWT de la tabla.
--
-- `shipments.client_id` referencia `clients (id)` con ON DELETE NO ACTION, así
-- que borrar un cliente que todavía tiene embarques falla con `23503`, que
-- `deleteClientAction` mapea a un mensaje de "tiene embarques asociados". La FK
-- es la guarda, y el borrado nunca hace cascada.
drop policy if exists "Users can read clients"   on public.clients;
drop policy if exists "Users can insert clients" on public.clients;
drop policy if exists "Users can update clients" on public.clients;
drop policy if exists "Users can delete clients" on public.clients;

create policy "Users can read clients"
  on public.clients
  for select
  using (auth.uid() is not null);

create policy "Users can insert clients"
  on public.clients
  for insert
  with check (auth.uid() is not null);

create policy "Users can update clients"
  on public.clients
  for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy "Users can delete clients"
  on public.clients
  for delete
  using (auth.uid() is not null);

-- shipments -----------------------------------------------------------------
drop policy if exists "Users can read shipments"   on public.shipments;
drop policy if exists "Users can insert shipments" on public.shipments;
drop policy if exists "Users can update shipments" on public.shipments;
drop policy if exists "Users can delete shipments" on public.shipments;

create policy "Users can read shipments"
  on public.shipments
  for select
  using (auth.uid() is not null);

create policy "Users can insert shipments"
  on public.shipments
  for insert
  with check (auth.uid() is not null);

create policy "Users can update shipments"
  on public.shipments
  for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy "Users can delete shipments"
  on public.shipments
  for delete
  using (auth.uid() is not null);

-- -----------------------------------------------------------------------------
-- Agregación del dashboard (decisión D16)
-- -----------------------------------------------------------------------------
-- Una única función que devuelve TODOS los agregados del dashboard como un solo
-- valor JSON: total, conteos por estado, conteos por modalidad y buckets
-- mensuales `AAAA-MM`. Así la página hace una sola llamada en vez de descargar
-- todas las filas y agruparlas en JavaScript.
--
-- `security invoker` es deliberado: la función corre con la identidad del
-- llamador, así que la RLS de `shipments` sigue aplicando y la función NO la
-- elude. `stable` porque solo lee. `set search_path = public` evita que un
-- search_path del llamador redirija las tablas.
--
-- Forma del JSON:
--   {
--     "total": 40,
--     "by_status":   { "Pendiente": 7, "En tránsito": 10, ... },
--     "by_modality": { "FCL": 20, "LCL": 10, "AIR": 10 },
--     "monthly":     [ { "month": "2026-08", "count": 5 }, ... ]
--   }
-- `by_status` / `by_modality` son mapas dispersos: un valor sin filas no aparece
-- y el cliente lee con `?? 0`. `monthly` va ordenado ascendente por mes.
-- -----------------------------------------------------------------------------
create or replace function public.get_dashboard_stats()
returns json
language sql
stable
security invoker
set search_path = public
as $$
  select json_build_object(
    'total',       (select count(*)::int from public.shipments),
    'by_status',   coalesce((
      select jsonb_object_agg(s.status, s.cnt)
      from (
        select status, count(*)::int as cnt
        from public.shipments
        group by status
      ) s
    ), '{}'::jsonb),
    'by_modality', coalesce((
      select jsonb_object_agg(m.modality, m.cnt)
      from (
        select modality, count(*)::int as cnt
        from public.shipments
        group by modality
      ) m
    ), '{}'::jsonb),
    'monthly',     coalesce((
      select jsonb_agg(
        jsonb_build_object('month', t.month, 'count', t.cnt)
        order by t.month
      )
      from (
        select to_char(date_trunc('month', created_at), 'YYYY-MM') as month,
               count(*)::int as cnt
        from public.shipments
        group by 1
      ) t
    ), '[]'::jsonb)
  );
$$;

comment on function public.get_dashboard_stats() is
  'Agregados pre-calculados del dashboard (conteos por estado y modalidad, buckets mensuales AAAA-MM). Security invoker: respeta RLS.';