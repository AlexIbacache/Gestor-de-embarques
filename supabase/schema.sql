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

-- =============================================================================
-- Hitos, historial y panel de atención
-- =============================================================================
-- Equivale a `supabase/migrations/20261016_milestones.sql` (sin el backfill, que
-- no aplica a una base nueva). Mantener ambos archivos en sincronía.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A. Notas del embarque
-- -----------------------------------------------------------------------------
-- Texto libre opcional que se muestra en el detalle del embarque. Nullable a
-- propósito: es la única columna de `shipments` que no es obligatoria, porque un
-- embarque se puede crear sin notas.
alter table public.shipments add column if not exists notes text;

alter table public.shipments drop constraint if exists shipments_notes_length_check;
alter table public.shipments
  add constraint shipments_notes_length_check
  check (notes is null or char_length(notes) <= 1000);

-- -----------------------------------------------------------------------------
-- B. Hitos del embarque: public.shipment_milestones
-- -----------------------------------------------------------------------------
-- Cada embarque tiene EXACTAMENTE cinco hitos fijos, creados por trigger al
-- insertar el embarque (sección D). El paso "En tránsito" que muestra la UI NO se
-- guarda: se deriva (Zarpe completado y Arribo pendiente), así no hay dos fechas
-- que puedan contradecirse.
--
--   step 1  Reserva           reserva confirmada con la naviera/aerolínea
--   step 2  Ingreso a puerto  la carga entra al puerto o terminal de origen
--   step 3  Zarpe             sale la nave o despega el vuelo
--   step 4  Arribo            llega al puerto o aeropuerto de destino
--   step 5  Entrega           la carga llega al cliente
--
-- `planned_date` = fecha prevista; `actual_date` = fecha real. Un hito está
-- completado cuando `actual_date` no es nulo. Son `date` (no instantes), igual
-- que `shipments.eta`.
--
-- ON DELETE CASCADE aquí SÍ es correcto, a diferencia de shipments.client_id: los
-- hitos no tienen sentido sin su embarque y borrarlos junto con él no destruye
-- información que alguien haya cargado a propósito por separado.
-- -----------------------------------------------------------------------------
create table if not exists public.shipment_milestones (
  id           uuid primary key default gen_random_uuid(),
  shipment_id  uuid not null references public.shipments (id) on delete cascade,
  name         text not null,
  step         smallint not null,
  planned_date date,
  actual_date  date,
  created_at   timestamptz default now(),

  -- Dominio cerrado: el par (nombre, paso) solo puede ser uno de estos cinco, así
  -- que no se pueden inventar hitos ni reordenarlos desde fuera.
  constraint shipment_milestones_name_step_check
    check ((name, step) in (
      ('Reserva',          1::smallint),
      ('Ingreso a puerto', 2::smallint),
      ('Zarpe',            3::smallint),
      ('Arribo',           4::smallint),
      ('Entrega',          5::smallint)
    )),
  constraint shipment_milestones_unique_name unique (shipment_id, name),
  constraint shipment_milestones_planned_range_check
    check (planned_date is null
           or planned_date between date '2000-01-01' and date '2100-12-31'),
  constraint shipment_milestones_actual_range_check
    check (actual_date is null
           or actual_date between date '2000-01-01' and date '2100-12-31')
);

comment on table public.shipment_milestones is
  'Cinco hitos fijos por embarque (Reserva, Ingreso a puerto, Zarpe, Arribo, Entrega). Creados por trigger; la app solo edita planned_date y actual_date.';

-- La FK ya tiene el índice implícito del UNIQUE (shipment_id, name), que cubre las
-- búsquedas por embarque. Este cubre las consultas de hitos vencidos.
create index if not exists shipment_milestones_overdue_idx
  on public.shipment_milestones (planned_date)
  where actual_date is null;

-- -----------------------------------------------------------------------------
-- C. Historial del embarque: public.shipment_events
-- -----------------------------------------------------------------------------
-- Bitácora de solo-agregar. La llenan EXCLUSIVAMENTE los triggers de la sección D
-- (con SECURITY DEFINER); los usuarios autenticados solo pueden leerla. Así el
-- historial no se puede falsificar ni editar desde la API, y la app no necesita
-- escribirlo a mano en cada Server Action.
--
-- `actor_email` sale del JWT del llamador; queda NULL cuando el cambio lo hace el
-- rol `postgres` desde el editor SQL (migraciones, seed).
-- -----------------------------------------------------------------------------
create table if not exists public.shipment_events (
  id          uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments (id) on delete cascade,
  kind        text not null,
  message     text not null,
  actor_email text,
  created_at  timestamptz not null default now(),

  constraint shipment_events_kind_check
    check (kind in ('Creado', 'Estado', 'ETA', 'Hito')),
  constraint shipment_events_message_length_check
    check (char_length(message) <= 300)
);

comment on table public.shipment_events is
  'Historial de solo-agregar de cada embarque (creación, cambios de estado y ETA, hitos). Escrito solo por triggers.';

create index if not exists shipment_events_shipment_idx
  on public.shipment_events (shipment_id, created_at desc);

-- -----------------------------------------------------------------------------
-- D. Triggers
-- -----------------------------------------------------------------------------
-- SECURITY DEFINER + search_path fijo: las funciones escriben en tablas donde el
-- usuario no tiene permiso de INSERT (a propósito). Son funciones de trigger: no
-- se pueden invocar como RPC, y además se les retira EXECUTE al final.

-- D1. Al crear un embarque: sus cinco hitos vacíos.
create or replace function public.seed_shipment_milestones()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.shipment_milestones (shipment_id, name, step) values
    (new.id, 'Reserva',          1),
    (new.id, 'Ingreso a puerto', 2),
    (new.id, 'Zarpe',            3),
    (new.id, 'Arribo',           4),
    (new.id, 'Entrega',          5)
  on conflict (shipment_id, name) do nothing;
  return new;
end;
$$;

-- D2. Historial de creación y de cambios de estado / ETA.
create or replace function public.log_shipment_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor text := nullif(auth.jwt() ->> 'email', '');
begin
  if tg_op = 'INSERT' then
    insert into public.shipment_events (shipment_id, kind, message, actor_email)
    values (new.id, 'Creado', 'Embarque creado', actor);
    return null;
  end if;

  if new.status is distinct from old.status then
    insert into public.shipment_events (shipment_id, kind, message, actor_email)
    values (
      new.id, 'Estado',
      format('Estado cambiado de %s a %s', old.status, new.status),
      actor
    );
  end if;

  if new.eta is distinct from old.eta then
    insert into public.shipment_events (shipment_id, kind, message, actor_email)
    values (
      new.id, 'ETA',
      format('ETA cambiada de %s a %s',
             to_char(old.eta, 'DD/MM/YYYY'), to_char(new.eta, 'DD/MM/YYYY')),
      actor
    );
  end if;

  return null;
end;
$$;

-- D3. Historial de hitos completados o reabiertos.
create or replace function public.log_milestone_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor text := nullif(auth.jwt() ->> 'email', '');
begin
  if new.actual_date is not distinct from old.actual_date then
    return null;
  end if;

  insert into public.shipment_events (shipment_id, kind, message, actor_email)
  values (
    new.shipment_id, 'Hito',
    case
      when new.actual_date is null then
        format('Hito «%s» reabierto', new.name)
      else
        format('Hito «%s» completado el %s',
               new.name, to_char(new.actual_date, 'DD/MM/YYYY'))
    end,
    actor
  );

  return null;
end;
$$;

drop trigger if exists shipments_seed_milestones on public.shipments;
create trigger shipments_seed_milestones
  after insert on public.shipments
  for each row execute function public.seed_shipment_milestones();

drop trigger if exists shipments_log_changes on public.shipments;
create trigger shipments_log_changes
  after insert or update of status, eta on public.shipments
  for each row execute function public.log_shipment_changes();

drop trigger if exists shipment_milestones_log_changes on public.shipment_milestones;
create trigger shipment_milestones_log_changes
  after update of actual_date on public.shipment_milestones
  for each row execute function public.log_milestone_changes();

revoke execute on function public.seed_shipment_milestones() from public, anon, authenticated;
revoke execute on function public.log_shipment_changes()     from public, anon, authenticated;
revoke execute on function public.log_milestone_changes()    from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- E. Row Level Security y permisos
-- -----------------------------------------------------------------------------
-- Mismo criterio que el resto del esquema (cualquier usuario autenticado), pero
-- con el mínimo privilegio que la UI necesita:
--   * hitos:     leer, y editar SOLO planned_date / actual_date (permiso por
--                columna). Sin INSERT ni DELETE: los crea el trigger y se borran
--                en cascada con el embarque (las acciones referenciales no pasan
--                por RLS).
--   * historial: solo leer.
-- Supabase concede todo a anon/authenticated por defecto en tablas nuevas; se
-- revoca y se vuelve a conceder lo justo.
-- -----------------------------------------------------------------------------
alter table public.shipment_milestones enable row level security;
alter table public.shipment_events     enable row level security;

revoke all on public.shipment_milestones from anon, authenticated;
revoke all on public.shipment_events     from anon, authenticated;

grant select on public.shipment_milestones to authenticated;
grant update (planned_date, actual_date) on public.shipment_milestones to authenticated;
grant select on public.shipment_events to authenticated;

drop policy if exists "Users can read milestones"   on public.shipment_milestones;
drop policy if exists "Users can update milestones" on public.shipment_milestones;
drop policy if exists "Users can read shipment events" on public.shipment_events;

create policy "Users can read milestones"
  on public.shipment_milestones
  for select
  using (auth.uid() is not null);

create policy "Users can update milestones"
  on public.shipment_milestones
  for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy "Users can read shipment events"
  on public.shipment_events
  for select
  using (auth.uid() is not null);

-- -----------------------------------------------------------------------------
-- F. Panel "Requiere atención" del dashboard
-- -----------------------------------------------------------------------------
-- Igual que get_dashboard_stats (D16): una sola llamada, agregación en Postgres,
-- security invoker para que la RLS siga aplicando. Devuelve un arreglo JSON de
-- hasta 10 elementos, los embarques retrasados primero y luego los hitos vencidos
-- (con fecha prevista pasada y sin fecha real) de embarques todavía abiertos:
--   [ { "shipment_id": "...", "reference": "EMB-2414", "company": "...",
--       "kind": "retraso" | "hito_vencido", "milestone": null | "Zarpe",
--       "days": 3 }, ... ]
-- `days` = días de atraso (ETA vencida o fecha prevista del hito vencida).
-- El texto lo compone la UI: la base solo entrega hechos.
-- -----------------------------------------------------------------------------
create or replace function public.get_attention_items()
returns json
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    json_agg(t order by t.priority, t.days desc, t.reference),
    '[]'::json
  )
  from (
    select *
    from (
      select s.id as shipment_id,
             s.reference,
             coalesce(c.company, 'Sin cliente') as company,
             'retraso'::text as kind,
             null::text as milestone,
             greatest(current_date - s.eta, 0) as days,
             1 as priority
      from public.shipments s
      left join public.clients c on c.id = s.client_id
      where s.status = 'Retrasado'

      union all

      select s.id,
             s.reference,
             coalesce(c.company, 'Sin cliente'),
             'hito_vencido'::text,
             m.name,
             current_date - m.planned_date,
             2
      from public.shipment_milestones m
      join public.shipments s on s.id = m.shipment_id
      left join public.clients c on c.id = s.client_id
      where m.actual_date is null
        and m.planned_date < current_date
        and s.status in ('Pendiente', 'En tránsito')
    ) i
    order by i.priority, i.days desc, i.reference
    limit 10
  ) t;
$$;

comment on function public.get_attention_items() is
  'Hasta 10 elementos para el panel "Requiere atención": embarques retrasados y hitos vencidos. Security invoker: respeta RLS.';
