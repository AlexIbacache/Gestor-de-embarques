# Spec Delta

## Purpose

Define las garantías de integridad que la base de datos impone por sí misma, de forma independiente a la validación de la aplicación, para que ningún camino de escritura pueda persistir datos fuera de dominio.

## ADDED Requirements

### Requirement: Valores de dominio de embarques
La base de datos DEBE restringir `shipments.status` a exactamente los cinco estados canónicos (Pendiente, En tránsito, Entregado, Retrasado, Cancelado) y `shipments.modality` a exactamente las tres modalidades (FCL, LCL, AIR), rechazando cualquier otro valor incluso si la escritura elude la validación de la aplicación.

#### Scenario: Estado fuera de dominio
- **WHEN** una operación de escritura intenta persistir un embarque con un estado fuera de los cinco valores canónicos
- **THEN** la base de datos rechaza la operación con un error de integridad y no persiste el registro

#### Scenario: Modalidad fuera de dominio
- **WHEN** una operación de escritura intenta persistir un embarque con una modalidad distinta de FCL, LCL o AIR
- **THEN** la base de datos rechaza la operación con un error de integridad y no persiste el registro

#### Scenario: Valores canónicos aceptados
- **WHEN** una operación de escritura persiste un embarque con estado y modalidad canónicos
- **THEN** la base de datos acepta la operación

### Requirement: Límites de longitud en columnas de texto
Las columnas de texto de negocio de `clients` y `shipments` (nombre, email, empresa, referencia, origen, destino) DEBEN tener límites máximos de longitud razonables definidos en la base de datos, que rechacen valores desmedidos.

#### Scenario: Texto que excede el límite
- **WHEN** una operación de escritura intenta persistir un valor de texto que excede el límite de su columna
- **THEN** la base de datos rechaza la operación con un error de integridad

#### Scenario: Texto dentro del límite
- **WHEN** una operación de escritura persiste valores dentro de los límites definidos
- **THEN** la base de datos acepta la operación

### Requirement: Coherencia de fechas de embarque
La base de datos DEBE rechazar valores de `shipments.eta` fuera de un rango operativo amplio de fechas de calendario plausibles.

#### Scenario: ETA implausible
- **WHEN** una operación de escritura intenta persistir un embarque con una ETA fuera del rango operativo definido (por ejemplo año 1850 o año 3000)
- **THEN** la base de datos rechaza la operación con un error de integridad

### Requirement: Integridad referencial clientes-embarques
Todo embarque DEBE referenciar un cliente existente. La eliminación de un cliente con embarques asociados DEBE ser rechazada por la base de datos y NUNCA DEBE eliminar embarques en cascada.

#### Scenario: Embarque con cliente inexistente
- **WHEN** una operación de escritura intenta persistir un embarque que referencia un cliente inexistente
- **THEN** la base de datos rechaza la operación con un error de integridad referencial

#### Scenario: Eliminación bloqueada por la FK
- **WHEN** se intenta eliminar un cliente que tiene embarques asociados
- **THEN** la base de datos rechaza la eliminación y los embarques permanecen intactos

### Requirement: Unicidad de referencia de embarque
La referencia de un embarque DEBE ser única en toda la tabla `shipments`.

#### Scenario: Referencia duplicada
- **WHEN** una operación de escritura intenta persistir un embarque con una referencia ya existente
- **THEN** la base de datos rechaza la operación con un error de unicidad

### Requirement: Obligatoriedad de campos de negocio
Todas las columnas de negocio de `clients` y `shipments` DEBEN ser obligatorias (NOT NULL): la base de datos no debe depender de la validación de la aplicación para garantizar registros completos.

#### Scenario: Campo obligatorio ausente
- **WHEN** una operación de escritura intenta persistir un registro con un campo de negocio nulo o ausente
- **THEN** la base de datos rechaza la operación con un error de integridad
