-- =============================================================================
-- Gestor de Embarques — Datos de ejemplo
-- =============================================================================
-- Ejecutar DESPUÉS de schema.sql, en el editor SQL de Supabase.
--
-- Idempotente: borra los datos de ejemplo antes de insertar, así que se puede
-- volver a ejecutar las veces que haga falta sin duplicar nada. Solo borra
-- filas previamente sembradas por este mismo script.
--
-- NOTAS DE EJECUCIÓN
--   RLS está habilitado y todas las políticas exigen `auth.uid() is not null`.
--   Por eso este script se ejecuta como el rol `postgres` (bypassa RLS) desde el
--   editor SQL. Correrlo con la `publishable` key desde la app insertaría 0 filas
--   en silencio, porque no hay sesión de Auth.
--
-- DECISIONES
--   * Las fechas son RELATIVAS a `current_date`, no absolutas. Con fechas fijas
--     el dataset envejece: en unos meses los 40 embarques figuran vencidos y el
--     filtro por estado deja de reflejar una operación real.
--   * `eta` en el pasado para "Entregado" y "Retrasado", en el futuro para
--     "Pendiente" y "En tránsito". Sin esa coherencia, el badge de estado
--     contradice la fecha visible al lado.
--   * `client_id` se resuelve por email en un subselect en vez de escribir
--     uuids literales: el seed sobrevive a cualquier recambio de ids.
--   * `make_interval(days => n)` en vez de `n || ' days'::interval`. Ambas
--     funcionan, pero la primera no depende de que Postgres resuelva el operador
--     `anynonarray || text` por coerción implícita.
-- =============================================================================

-- Limpieza idempotente: primero los embarques por la FK, después los clientes.
delete from public.shipments
 where reference like 'EMB-%';

delete from public.clients
 where email like '%@seed.logistica.test';


-- -----------------------------------------------------------------------------
-- 15 clientes
-- -----------------------------------------------------------------------------
insert into public.clients (name, email, company) values
  ('María Fernández',   'maria.fernandez@seed.logistica.test',    'Fernández & Hijos S.A.'),
  ('Carlos Mendoza',    'carlos.mendoza@seed.logistica.test',     'MendozaDistribuciones'),
  ('Lucía Ramírez',     'lucia.ramirez@seed.logistica.test',      'Ramírez Textiles SRL'),
  ('Diego Sosa',        'diego.sosa@seed.logistica.test',         'Sosa Agroindustrial'),
  ('Valentina Ortiz',   'valentina.ortiz@seed.logistica.test',    'Ortiz Farmacéutica'),
  ('Nicolás Herrera',   'nicolas.herrera@seed.logistica.test',   'Herrera Autopartes'),
  ('Sofía Cáceres',     'sofia.caceres@seed.logistica.test',      'Cáceres Electrónica'),
  ('Andrés Villalba',   'andres.villalba@seed.logistica.test',    'Villalba Constructora'),
  ('Camila Peralta',    'camila.peralta@seed.logistica.test',     'Peralta Deportes'),
  ('Gonzalo Nieva',     'gonzalo.nieva@seed.logistica.test',      'Nieva Metalúrgica'),
  ('Florencia Aymá',    'florencia.ayma@seed.logistica.test',     'Aymá Cosméticos'),
  ('Federico Luna',     'federico.luna@seed.logistica.test',      'Luna Logística'),
  ('Agustina Quiroga',  'agustina.quiroga@seed.logistica.test',   'Quiroga Vitivinícola'),
  ('Joaquín Correa',    'joaquin.correa@seed.logistica.test',     'Correa Electrónica'),
  ('Rocío Sandoval',    'rocio.sandoval@seed.logistica.test',     'Sandoval Papelera');


-- -----------------------------------------------------------------------------
-- 40 embarques
-- -----------------------------------------------------------------------------
-- La distribución real de estados, verificada sobre el propio archivo:
--   Entregado   14  -> eta pasada
--   En tránsito 10  -> eta futura
--   Pendiente    7  -> eta futura
--   Retrasado    6  -> eta pasada (el badge y la fecha son coherentes)
--   Cancelado    3  -> eta = hoy (el embarque nunca salió)
--
-- `eta` abarca de -48 a +29 días respecto de hoy, así que los filtros por
-- estado y el orden por ETA tienen material real con el que trabajar.
-- -----------------------------------------------------------------------------
-- INVARIANTE: toda fila con estado "Entregado" o "Retrasado" tiene
-- `eta_offset` negativo, y toda fila "Pendiente" o "En tránsito" lo tiene
-- positivo. Si agregás filas a mano, mantenelo: un "Entregado" con ETA futura
-- hace que el badge contradiga la fecha visible al lado.
-- -----------------------------------------------------------------------------
insert into public.shipments
  (reference, client_id, origin, destination, modality, status, eta, created_at)
select
  s.reference,
  c.id,
  s.origin,
  s.destination,
  s.modality,
  s.status,
  (current_date + s.eta_offset) as eta,
  (now() - make_interval(days => s.created_days)) as created_at
from (values
  -- reference,    email del cliente,                                        origen,            destino,            modality, status,        eta_offset, created_days
  ('EMB-2026-0001', 'maria.fernandez@seed.logistica.test',    'Buenos Aires, AR', 'Rotterdam, NL',     'FCL', 'Entregado',   -38,  52),
  ('EMB-2026-0002', 'carlos.mendoza@seed.logistica.test',     'Rosario, AR',     'Santiago, CL',      'LCL', 'En tránsito',  6,  19),
  ('EMB-2026-0003', 'lucia.ramirez@seed.logistica.test',      'Córdoba, AR',     'Miami, US',         'AIR', 'Entregado',   -26,  40),
  ('EMB-2026-0004', 'diego.sosa@seed.logistica.test',         'Bahía Blanca, AR','Paraná, BR',        'LCL', 'Retrasado',    -9,  31),
  ('EMB-2026-0005', 'valentina.ortiz@seed.logistica.test',    'La Plata, AR',    'Madrid, ES',        'FCL', 'En tránsito', 11,  16),
  ('EMB-2026-0006', 'nicolas.herrera@seed.logistica.test',    'Mendoza, AR',     'Santiago, CL',      'FCL', 'Entregado',   -45,  60),
  ('EMB-2026-0007', 'sofia.caceres@seed.logistica.test',      'CABA, AR',        'Shenzhen, CN',      'AIR', 'Pendiente',   21,   7),
  ('EMB-2026-0008', 'andres.villalba@seed.logistica.test',    'Rosario, AR',     'Montevideo, UY',    'FCL', 'Entregado',   -33,  47),
  ('EMB-2026-0009', 'camila.peralta@seed.logistica.test',     'Mar del Plata, AR','Barcelona, ES',    'LCL', 'En tránsito',  4,  22),
  ('EMB-2026-0010', 'gonzalo.nieva@seed.logistica.test',      'San Nicolás, AR', 'Houston, US',       'FCL', 'Cancelado',     0,  28),
  ('EMB-2026-0011', 'florencia.ayma@seed.logistica.test',     'Córdoba, AR',     'Lima, PE',          'AIR', 'Entregado',   -21,  36),
  ('EMB-2026-0012', 'federico.luna@seed.logistica.test',      'Buenos Aires, AR', 'Antwerp, BE',       'FCL', 'Pendiente',   16,   5),
  ('EMB-2026-0013', 'agustina.quiroga@seed.logistica.test',   'Salta, AR',       'Valparaíso, CL',    'LCL', 'Retrasado',   -12,  34),
  ('EMB-2026-0014', 'joaquin.correa@seed.logistica.test',     'CABA, AR',        'Berlin, DE',        'AIR', 'En tránsito',  9,  13),
  ('EMB-2026-0015', 'rocio.sandoval@seed.logistica.test',     'La Plata, AR',    'Puerto Montt, CL',  'FCL', 'Entregado',   -29,  44),
  ('EMB-2026-0016', 'maria.fernandez@seed.logistica.test',    'Buenos Aires, AR', 'Santos, BR',        'FCL', 'En tránsito', 13,  11),
  ('EMB-2026-0017', 'carlos.mendoza@seed.logistica.test',     'Bahía Blanca, AR','Buenos Aires, AR',   'LCL', 'Entregado',   -17,  30),
  ('EMB-2026-0018', 'lucia.ramirez@seed.logistica.test',      'Córdoba, AR',     'New York, US',      'AIR', 'Pendiente',   25,   3),
  ('EMB-2026-0019', 'diego.sosa@seed.logistica.test',         'Santa Fe, AR',    'Asunción, PY',      'FCL', 'Retrasado',    -6,  24),
  ('EMB-2026-0020', 'valentina.ortiz@seed.logistica.test',    'Buenos Aires, AR', 'Singapur, SG',      'AIR', 'En tránsito', 18,   9),
  ('EMB-2026-0021', 'nicolas.herrera@seed.logistica.test',    'Mendoza, AR',     'Lima, PE',          'FCL', 'Entregado',   -41,  58),
  ('EMB-2026-0022', 'sofia.caceres@seed.logistica.test',      'CABA, AR',        'Seúl, KR',          'AIR', 'Pendiente',   29,   2),
  ('EMB-2026-0023', 'andres.villalba@seed.logistica.test',    'Bahía Blanca, AR','Córdoba, AR',       'FCL', 'Cancelado',     0,  20),
  ('EMB-2026-0024', 'camila.peralta@seed.logistica.test',     'Mar del Plata, AR','Montevideo, UY',    'LCL', 'En tránsito',  7,  15),
  ('EMB-2026-0025', 'gonzalo.nieva@seed.logistica.test',      'San Nicolás, AR', 'Rotterdam, NL',     'FCL', 'Entregado',   -35,  49),
  ('EMB-2026-0026', 'florencia.ayma@seed.logistica.test',     'Córdoba, AR',     'Barcelona, ES',     'AIR', 'Retrasado',   -15,  38),
  ('EMB-2026-0027', 'federico.luna@seed.logistica.test',      'Buenos Aires, AR', 'Durban, ZA',        'FCL', 'En tránsito', 26,   6),
  ('EMB-2026-0028', 'agustina.quiroga@seed.logistica.test',   'Salta, AR',       'Santiago, CL',      'FCL', 'Entregado',   -24,  42),
  ('EMB-2026-0029', 'joaquin.correa@seed.logistica.test',     'CABA, AR',        'París, FR',         'AIR', 'Pendiente',   12,   8),
  ('EMB-2026-0030', 'rocio.sandoval@seed.logistica.test',     'La Plata, AR',    'Porto Alegre, BR',  'LCL', 'Retrasado',   -11,  33),
  ('EMB-2026-0031', 'maria.fernandez@seed.logistica.test',    'Buenos Aires, AR', 'Chicago, US',       'FCL', 'Entregado',   -48,  63),
  ('EMB-2026-0032', 'carlos.mendoza@seed.logistica.test',     'Rosario, AR',     'Houston, US',       'AIR', 'En tránsito',  3,  18),
  ('EMB-2026-0033', 'lucia.ramirez@seed.logistica.test',      'Córdoba, AR',     'Bogotá, CO',        'FCL', 'Pendiente',   19,   4),
  ('EMB-2026-0034', 'diego.sosa@seed.logistica.test',         'Santa Fe, AR',    'Santos, BR',        'LCL', 'Cancelado',     0,  26),
  ('EMB-2026-0035', 'valentina.ortiz@seed.logistica.test',    'Buenos Aires, AR', 'Ginebra, CH',       'AIR', 'Entregado',   -19,  33),
  ('EMB-2026-0036', 'nicolas.herrera@seed.logistica.test',    'Mendoza, AR',     'Rotterdam, NL',     'FCL', 'Retrasado',    -8,  29),
  ('EMB-2026-0037', 'sofia.caceres@seed.logistica.test',      'CABA, AR',        'Madrid, ES',        'FCL', 'En tránsito', 15,  10),
  ('EMB-2026-0038', 'andres.villalba@seed.logistica.test',    'Mar del Plata, AR','Antwerp, BE',       'LCL', 'Entregado',   -30,  45),
  ('EMB-2026-0039', 'camila.peralta@seed.logistica.test',     'Mar del Plata, AR','Miami, US',         'AIR', 'Pendiente',   23,   1),
  ('EMB-2026-0040', 'gonzalo.nieva@seed.logistica.test',      'San Nicolás, AR', 'Valencia, ES',      'FCL', 'Entregado',   -27,  41)
) as s(reference, client_email, origin, destination, modality, status, eta_offset, created_days)
join public.clients c on c.email = s.client_email;


-- -----------------------------------------------------------------------------
-- Verificación
-- -----------------------------------------------------------------------------
select 'clients' as tabla, count(*) as filas from public.clients
union all
select 'shipments', count(*) from public.shipments
order by tabla;

-- Debe devolver 5 filas, una por estado del enum de la app.
select status, count(*)
  from public.shipments
 group by status
 order by status;
