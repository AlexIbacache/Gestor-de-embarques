# Spec Delta

## Purpose

Gestiona el ciclo de vida completo de embarques: creación, edición, eliminación, listado con búsqueda, filtros, ordenamiento, paginación y vista de detalle.

## ADDED Requirements

### Requirement: Listar embarques
El sistema DEBE mostrar una tabla de embarques con las columnas: Referencia, Cliente, Origen, Destino, Modalidad, Estado, ETA, Fecha de creación y Acciones. El nombre del cliente DEBE ser fácilmente identificable. En mobile, la información DEBE transformarse en cards.

#### Scenario: Listado con datos
- **WHEN** el usuario navega a `/embarques` y existen embarques registrados
- **THEN** el sistema muestra la tabla/cards con los datos de los embarques, incluyendo el nombre del cliente asociado

#### Scenario: Listado vacío
- **WHEN** el usuario navega a `/embarques` y no existen embarques
- **THEN** el sistema muestra un estado vacío con mensaje y botón para crear embarque

### Requirement: Crear embarque
El sistema DEBE permitir crear un embarque proporcionando: referencia, cliente (seleccionable), origen, destino, modalidad (FCL/LCL/AIR), estado y ETA. Los datos DEBEN validarse con Zod.

#### Scenario: Creación exitosa
- **WHEN** el usuario completa el formulario con datos válidos y lo envía
- **THEN** el sistema crea el registro, cierra el diálogo, revalida la página y muestra un toast de confirmación

#### Scenario: Referencia duplicada
- **WHEN** el usuario intenta crear un embarque con una referencia que ya existe
- **THEN** el sistema muestra un error indicando que la referencia debe ser única

### Requirement: Editar embarque
El sistema DEBE permitir editar los datos de un embarque existente.

#### Scenario: Edición exitosa
- **WHEN** el usuario modifica los datos de un embarque y envía con datos válidos
- **THEN** el sistema actualiza el registro, cierra el diálogo, revalida la página y muestra un toast de confirmación

### Requirement: Eliminar embarque
El sistema DEBE permitir eliminar un embarque, requiriendo confirmación antes de ejecutar la eliminación.

#### Scenario: Eliminación confirmada
- **WHEN** el usuario confirma la eliminación de un embarque
- **THEN** el sistema elimina el registro, revalida la página y muestra un toast de confirmación

#### Scenario: Eliminación cancelada
- **WHEN** el usuario cancela la confirmación de eliminación
- **THEN** el sistema no elimina el registro y cierra el diálogo de confirmación

### Requirement: Detalle de embarque
El sistema DEBE mostrar una vista de detalle en `/embarques/[id]` con: referencia, estado (badge), cliente (nombre, email, empresa), ruta (origen → destino), modalidad, ETA y fecha de creación.

#### Scenario: Ver detalle
- **WHEN** el usuario navega a `/embarques/[id]` con un ID válido
- **THEN** el sistema muestra toda la información del embarque incluyendo los datos del cliente asociado

#### Scenario: ID inexistente
- **WHEN** el usuario navega a `/embarques/[id]` con un ID que no existe
- **THEN** el sistema muestra una página 404 o un error apropiado

### Requirement: Búsqueda de embarques
El sistema DEBE permitir buscar embarques por referencia, cliente, origen o destino. El término DEBE reflejarse en el parámetro de URL `search`.

#### Scenario: Búsqueda con resultados
- **WHEN** el usuario escribe un término en el campo de búsqueda
- **THEN** la URL se actualiza con `?search=<término>` y el listado filtra por coincidencias

### Requirement: Filtros de embarques
El sistema DEBE permitir filtrar embarques por estado (Pendiente, En tránsito, Entregado, Retrasado, Cancelado) y por modalidad (FCL, LCL, AIR). Los filtros DEBEN reflejarse en los parámetros de URL `status` y `modality`.

#### Scenario: Filtrar por estado
- **WHEN** el usuario selecciona un filtro de estado
- **THEN** la URL se actualiza con `?status=<estado>` y el listado muestra solo embarques con ese estado

#### Scenario: Filtros combinados
- **WHEN** el usuario combina búsqueda, filtro de estado, filtro de modalidad, ordenamiento y paginación
- **THEN** todos los parámetros se reflejan en la URL y la consulta los aplica simultáneamente

### Requirement: Ordenamiento de embarques
El sistema DEBE permitir ordenar embarques por referencia, cliente, origen, destino, estado, ETA o fecha de creación. Los parámetros `sort` y `order` DEBEN reflejarse en la URL.

#### Scenario: Cambiar ordenamiento
- **WHEN** el usuario hace clic en un encabezado de columna
- **THEN** la URL se actualiza y el listado se reordena según el campo y dirección seleccionados

### Requirement: Paginación de embarques
El sistema DEBE paginar los resultados del listado. El número de página DEBE reflejarse en el parámetro de URL `page`.

#### Scenario: Navegar entre páginas
- **WHEN** el usuario hace clic en un control de paginación
- **THEN** la URL se actualiza y se muestran los embarques de la página seleccionada

### Requirement: Estados de embarque con badge
El sistema DEBE mostrar el estado de cada embarque mediante un Badge con color diferenciado para cada estado: Pendiente, En tránsito, Entregado, Retrasado y Cancelado.

#### Scenario: Badge por estado
- **WHEN** se renderiza un embarque con un estado determinado
- **THEN** el badge muestra el texto del estado con un color visual diferenciado

### Requirement: Tipos de modalidad
El sistema DEBE restringir las modalidades de embarque a exactamente tres valores: FCL, LCL y AIR.

#### Scenario: Validación de modalidad
- **WHEN** se envía un formulario de embarque
- **THEN** el campo modalidad solo acepta los valores FCL, LCL o AIR

### Requirement: Consultas eficientes de embarques
La búsqueda, filtros, ordenamiento y paginación DEBEN ejecutarse como consultas en PostgreSQL, no filtrando en JavaScript.

#### Scenario: Consulta server-side con JOIN
- **WHEN** la página se carga con parámetros de filtro
- **THEN** el Server Component construye la consulta Supabase con filtros, orden y paginación, incluyendo los datos del cliente asociado

### Requirement: Seguridad RLS en embarques
La tabla `shipments` DEBE tener políticas de Row Level Security que permitan operaciones solo a usuarios autenticados.

#### Scenario: Acceso sin autenticación
- **WHEN** una petición llega a Supabase sin token válido
- **THEN** la base de datos rechaza la operación
