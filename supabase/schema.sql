-- =============================================================================
-- Gestor de Embarques — Esquema de base de datos
-- =============================================================================
-- Ejecutar en el editor SQL de Supabase (o `supabase db push`).
-- El script es idempotente: se puede volver a ejecutar sin errores.
--
-- Decisiones documentadas:
--   * NOT NULL en todas las columnas de negocio. Las Server Actions ya validan
--     con Zod, pero la base de datos no debe depender de esa validación.
--   * ON DELETE NO ACTION (default) en la FK shipments.client_id. La app no
--     permite eliminar clientes; si alguna vez lo hace, la FK bloquea el borrado
--     en vez de eliminar embarques en cascada de forma silenciosa.
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