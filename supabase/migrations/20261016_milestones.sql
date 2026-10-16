-- =============================================================================
-- Gestor de Embarques — Hitos, historial y panel de atención
-- =============================================================================
-- Script IDEMPOTENTE para bases de datos YA EXISTENTES. Re-ejecutable sin error.
--
-- Instalaciones nuevas usan `supabase/schema.sql`, que ya incluye todo esto al
-- final. Este archivo lleva una base existente al mismo estado.
--
-- QUÉ AGREGA
--   * shipments.notes                 notas opcionales del embarque
--   * shipment_milestones             5 hitos fijos por embarque (creados por trigger)
--   * shipment_events                 historial de solo-agregar (escrito por triggers)
--   * get_attention_items()           datos del panel "Requiere atención"
--   * backfill: hitos vacíos y evento "Creado" para los embarques que ya existen
--
-- CÓMO APLICAR
--   Pegar en el SQL Editor de Supabase y ejecutar una vez, como el rol `postgres`
--   (crea funciones, triggers y permisos). Requiere que las tablas base existan.
--
-- ROLLBACK (aditivo; la app actual no usa nada de esto)
--   drop function if exists public.get_attention_items();
--   drop trigger  if exists shipment_milestones_log_changes on public.shipment_milestones;
--   drop trigger  if exists shipments_log_changes           on public.shipments;
--   drop trigger  if exists shipments_seed_milestones       on public.shipments;
--   drop function if exists public.log_milestone_changes();
--   drop function if exists public.log_shipment_changes();
--   drop function if exists public.seed_shipment_milestones();
--   drop table    if exists public.shipment_events;
--   drop table    if exists public.shipment_milestones;
--   alter table public.shipments drop constraint if exists shipments_notes_length_check;
--   alter table public.shipments drop column if exists notes;
-- =============================================================================

do $$
begin
  if to_regclass('public.clients') is null
     or to_regclass('public.shipments') is null then
    raise exception
      'Falta public.clients o public.shipments: ejecutá primero supabase/schema.sql.';
  end if;
end $$;

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

-- -----------------------------------------------------------------------------
-- G. Backfill de los embarques que ya existían
-- -----------------------------------------------------------------------------
-- Hitos vacíos (sin fechas): la UI los muestra como pendientes hasta que alguien
-- los complete. Y un evento "Creado" con la fecha original del embarque, para que
-- el historial nunca aparezca vacío.
insert into public.shipment_milestones (shipment_id, name, step)
select s.id, h.name, h.step
from public.shipments s
cross join (values
  ('Reserva', 1), ('Ingreso a puerto', 2), ('Zarpe', 3), ('Arribo', 4), ('Entrega', 5)
) as h(name, step)
on conflict (shipment_id, name) do nothing;

insert into public.shipment_events (shipment_id, kind, message, created_at)
select s.id, 'Creado', 'Embarque creado', coalesce(s.created_at, now())
from public.shipments s
where not exists (
  select 1 from public.shipment_events e
  where e.shipment_id = s.id and e.kind = 'Creado'
);
