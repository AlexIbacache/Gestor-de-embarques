-- =============================================================================
-- Gestor de Embarques — Endurecimiento (iteration-2, decisión D17/D16)
-- =============================================================================
-- Script IDEMPOTENTE para bases de datos YA EXISTENTES. Re-ejecutable sin error.
--
-- Instalaciones nuevas usan `supabase/schema.sql`, que ya trae estos constraints
-- validados y la función RPC. Este archivo existe para llevar una base en
-- producción/desarrollo existente al mismo estado sin recrear tablas.
--
-- CÓMO APLICAR
--   REQUISITO: las tablas ya deben existir. Si la base es nueva, este NO es el
--   archivo correcto: corré `supabase/schema.sql`, que crea tablas, constraints,
--   RLS y la RPC de una vez. Este archivo solo lleva una base YA EXISTENTE al
--   mismo estado, sin recrear tablas.
--   Pegar este archivo en el SQL Editor de Supabase y ejecutarlo una vez.
--   Correrlo como el rol `postgres` (o cualquier rol dueño), igual que el seed,
--   porque crear constraints y funciones altera el catálogo.
--
-- ESTRATEGIA
--   Cada constraint se crea como NOT VALID: no escanea las filas existentes,
--   así que no falla si hay datos fuera de dominio, pero SÍ se aplica a toda
--   escritura nueva. Después se ejecuta VALIDATE CONSTRAINT; si los datos
--   cumplen, el constraint queda validado; si no, se emite un WARNING con la
--   consulta que lista las filas conflictivas y el constraint queda NOT VALID
--   (la migración igual termina sin error, y se puede reintentar tras corregir).
--
-- ANTES DE VALIDAR: LISTAR FILAS CONFLICTIVAS (por si el WARNING aparece)
--   select id, status      from public.shipments where status not in ('Pendiente', 'En tránsito', 'Entregado', 'Retrasado', 'Cancelado');
--   select id, modality    from public.shipments where modality not in ('FCL', 'LCL', 'AIR');
--   select id, name        from public.clients   where char_length(name) > 120;
--   select id, email       from public.clients   where char_length(email) > 254;
--   select id, company     from public.clients   where char_length(company) > 160;
--   select id, reference   from public.shipments where char_length(reference) > 60;
--   select id, origin      from public.shipments where char_length(origin) > 120;
--   select id, destination from public.shipments where char_length(destination) > 120;
--   select id, eta         from public.shipments where eta < date '2000-01-01' or eta > date '2100-12-31';
--
-- ROLLBACK (todos los cambios son aditivos; retirarlos no rompe la app, salvo
-- que el código que consume la RPC volvería a fallar su consulta)
--   alter table public.shipments drop constraint if exists shipments_status_check;
--   alter table public.shipments drop constraint if exists shipments_modality_check;
--   alter table public.clients   drop constraint if exists clients_name_length_check;
--   alter table public.clients   drop constraint if exists clients_email_length_check;
--   alter table public.clients   drop constraint if exists clients_company_length_check;
--   alter table public.shipments drop constraint if exists shipments_reference_length_check;
--   alter table public.shipments drop constraint if exists shipments_origin_length_check;
--   alter table public.shipments drop constraint if exists shipments_destination_length_check;
--   alter table public.shipments drop constraint if exists shipments_eta_range_check;
--   drop function if exists public.get_dashboard_stats();
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Preflight — este script asume que las tablas YA existen
-- -----------------------------------------------------------------------------
-- `'public.shipments'::regclass` LANZA 42P01 ("la relación public.shipments no
-- existe") cuando la tabla no está: el cast se evalúa ANTES de que el
-- `if not exists` pueda hacer algo, así que el guard no protege de una base
-- vacía. `to_regclass` devuelve NULL en vez de lanzar, y con eso el script puede
-- decir QUÉ hacer en lugar de morir con un error de catálogo.
-- -----------------------------------------------------------------------------

do $$
begin
  if to_regclass('public.clients') is null
     or to_regclass('public.shipments') is null then
    raise exception
      'Falta public.clients o public.shipments: esta base no tiene el esquema base. Este script es solo para bases YA EXISTENTES. Ejecutá primero supabase/schema.sql (crea tablas, constraints, RLS y la RPC) y después volvé a correr este archivo únicamente si la base ya existía sin los constraints.';
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 1. CHECK de dominio de embarques (decisión D17)
-- -----------------------------------------------------------------------------
-- Literales IDÉNTICOS a `src/lib/domain/shipments.ts` (fuente única, D18):
--   estados → Pendiente, En tránsito, Entregado, Retrasado, Cancelado
--   modalidades → FCL, LCL, AIR
-- -----------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.shipments'::regclass
      and conname = 'shipments_status_check'
  ) then
    alter table public.shipments
      add constraint shipments_status_check
      check (
        status in ('Pendiente', 'En tránsito', 'Entregado', 'Retrasado', 'Cancelado')
      )
      not valid;
  end if;
end $$;

do $$
begin
  alter table public.shipments validate constraint shipments_status_check;
exception
  when check_violation then
    raise warning 'shipments_status_check queda NOT VALID: hay filas con status fuera de dominio. Listalas con: select id, status from public.shipments where status not in (''Pendiente'', ''En tránsito'', ''Entregado'', ''Retrasado'', ''Cancelado''); Corregilas y reintentá.';
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.shipments'::regclass
      and conname = 'shipments_modality_check'
  ) then
    alter table public.shipments
      add constraint shipments_modality_check
      check (modality in ('FCL', 'LCL', 'AIR'))
      not valid;
  end if;
end $$;

do $$
begin
  alter table public.shipments validate constraint shipments_modality_check;
exception
  when check_violation then
    raise warning 'shipments_modality_check queda NOT VALID: hay filas con modality distinta de FCL/LCL/AIR. Listalas con: select id, modality from public.shipments where modality not in (''FCL'', ''LCL'', ''AIR''); Corregilas y reintentá.';
end $$;

-- -----------------------------------------------------------------------------
-- 2. Límites de longitud en columnas de texto (decisión D17)
-- -----------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.clients'::regclass
      and conname = 'clients_name_length_check'
  ) then
    alter table public.clients
      add constraint clients_name_length_check
      check (char_length(name) <= 120)
      not valid;
  end if;
end $$;

do $$
begin
  alter table public.clients validate constraint clients_name_length_check;
exception
  when check_violation then
    raise warning 'clients_name_length_check queda NOT VALID: hay nombres de más de 120 caracteres. Listalos con: select id, name from public.clients where char_length(name) > 120; Corregilos y reintentá.';
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.clients'::regclass
      and conname = 'clients_email_length_check'
  ) then
    alter table public.clients
      add constraint clients_email_length_check
      check (char_length(email) <= 254)
      not valid;
  end if;
end $$;

do $$
begin
  alter table public.clients validate constraint clients_email_length_check;
exception
  when check_violation then
    raise warning 'clients_email_length_check queda NOT VALID: hay emails de más de 254 caracteres. Listalos con: select id, email from public.clients where char_length(email) > 254; Corregilos y reintentá.';
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.clients'::regclass
      and conname = 'clients_company_length_check'
  ) then
    alter table public.clients
      add constraint clients_company_length_check
      check (char_length(company) <= 160)
      not valid;
  end if;
end $$;

do $$
begin
  alter table public.clients validate constraint clients_company_length_check;
exception
  when check_violation then
    raise warning 'clients_company_length_check queda NOT VALID: hay empresas de más de 160 caracteres. Listalas con: select id, company from public.clients where char_length(company) > 160; Corregilas y reintentá.';
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.shipments'::regclass
      and conname = 'shipments_reference_length_check'
  ) then
    alter table public.shipments
      add constraint shipments_reference_length_check
      check (char_length(reference) <= 60)
      not valid;
  end if;
end $$;

do $$
begin
  alter table public.shipments validate constraint shipments_reference_length_check;
exception
  when check_violation then
    raise warning 'shipments_reference_length_check queda NOT VALID: hay referencias de más de 60 caracteres. Listalas con: select id, reference from public.shipments where char_length(reference) > 60; Corregilas y reintentá.';
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.shipments'::regclass
      and conname = 'shipments_origin_length_check'
  ) then
    alter table public.shipments
      add constraint shipments_origin_length_check
      check (char_length(origin) <= 120)
      not valid;
  end if;
end $$;

do $$
begin
  alter table public.shipments validate constraint shipments_origin_length_check;
exception
  when check_violation then
    raise warning 'shipments_origin_length_check queda NOT VALID: hay orígenes de más de 120 caracteres. Listalos con: select id, origin from public.shipments where char_length(origin) > 120; Corregilos y reintentá.';
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.shipments'::regclass
      and conname = 'shipments_destination_length_check'
  ) then
    alter table public.shipments
      add constraint shipments_destination_length_check
      check (char_length(destination) <= 120)
      not valid;
  end if;
end $$;

do $$
begin
  alter table public.shipments validate constraint shipments_destination_length_check;
exception
  when check_violation then
    raise warning 'shipments_destination_length_check queda NOT VALID: hay destinos de más de 120 caracteres. Listalos con: select id, destination from public.shipments where char_length(destination) > 120; Corregilos y reintentá.';
end $$;

-- -----------------------------------------------------------------------------
-- 3. Sanidad de fecha de `shipments.eta` (decisión D17)
-- -----------------------------------------------------------------------------
-- `eta` es un `date` de calendario. Rango operativo amplio: descarta años
-- absurdos (1850, 3000) sin bloquear una ETA real.
-- -----------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.shipments'::regclass
      and conname = 'shipments_eta_range_check'
  ) then
    alter table public.shipments
      add constraint shipments_eta_range_check
      check (eta >= date '2000-01-01' and eta <= date '2100-12-31')
      not valid;
  end if;
end $$;

do $$
begin
  alter table public.shipments validate constraint shipments_eta_range_check;
exception
  when check_violation then
    raise warning 'shipments_eta_range_check queda NOT VALID: hay ETAs fuera de 2000-01-01..2100-12-31. Listalas con: select id, eta from public.shipments where eta < date ''2000-01-01'' or eta > date ''2100-12-31''; Corregilas y reintentá.';
end $$;

-- -----------------------------------------------------------------------------
-- 4. Auditoría de garantías ya presentes (no se recrean)
-- -----------------------------------------------------------------------------
--   * `shipments.client_id references public.clients (id)` con ON DELETE NO
--     ACTION (default): borrar un cliente con embarques falla con `23503` y
--     NUNCA elimina embarques en cascada.
--   * `shipments.reference` conserva `unique` (colisión → `23505`).
--   * Todas las columnas de negocio siguen NOT NULL.

-- -----------------------------------------------------------------------------
-- 5. RPC de agregación del dashboard (decisión D16)
-- -----------------------------------------------------------------------------
-- `create or replace` la vuelve idempotente por sí sola. `security invoker`: la
-- RLS de `shipments` sigue aplicando, la función no la elude. Ver el comentario
-- completo en `supabase/schema.sql`.
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
