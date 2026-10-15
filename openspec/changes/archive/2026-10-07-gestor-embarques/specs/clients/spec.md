# Spec Delta

## Purpose

Gestiona el ciclo de vida de los clientes: creación, edición, listado con búsqueda, ordenamiento y paginación.

## ADDED Requirements

### Requirement: Listar clientes
El sistema DEBE mostrar una tabla de clientes con las columnas: Nombre, Email, Empresa, Fecha de creación y Acciones. En mobile, la información DEBE transformarse en cards.

#### Scenario: Listado con datos
- **WHEN** el usuario navega a `/clientes` y existen clientes registrados
- **THEN** el sistema muestra la tabla/cards con los datos de los clientes

#### Scenario: Listado vacío
- **WHEN** el usuario navega a `/clientes` y no existen clientes
- **THEN** el sistema muestra un estado vacío con mensaje y botón para crear cliente

### Requirement: Crear cliente
El sistema DEBE permitir crear un cliente proporcionando nombre, email y empresa, validando los datos con Zod tanto en frontend como en servidor.

#### Scenario: Creación exitosa
- **WHEN** el usuario completa el formulario de creación con datos válidos y lo envía
- **THEN** el sistema crea el registro en la base de datos, cierra el diálogo, revalida la página y muestra un toast de confirmación

#### Scenario: Creación con datos inválidos
- **WHEN** el usuario envía el formulario con datos inválidos (campos vacíos o email malformado)
- **THEN** el sistema muestra los errores de validación y no crea el registro

### Requirement: Editar cliente
El sistema DEBE permitir editar los datos de un cliente existente (nombre, email, empresa).

#### Scenario: Edición exitosa
- **WHEN** el usuario modifica los datos de un cliente y envía el formulario con datos válidos
- **THEN** el sistema actualiza el registro, cierra el diálogo, revalida la página y muestra un toast de confirmación

### Requirement: Búsqueda de clientes
El sistema DEBE permitir buscar clientes por nombre, email o empresa. El término de búsqueda DEBE reflejarse en el parámetro de URL `search`.

#### Scenario: Búsqueda con resultados
- **WHEN** el usuario escribe un término en el campo de búsqueda
- **THEN** la URL se actualiza con `?search=<término>` y el listado muestra solo los clientes que coinciden

#### Scenario: Búsqueda sin resultados
- **WHEN** el usuario busca un término sin coincidencias
- **THEN** el sistema muestra un estado vacío indicando que no se encontraron resultados

### Requirement: Ordenamiento de clientes
El sistema DEBE permitir ordenar el listado de clientes por nombre, email, empresa o fecha de creación. Los parámetros `sort` y `order` DEBEN reflejarse en la URL.

#### Scenario: Cambiar ordenamiento
- **WHEN** el usuario hace clic en un encabezado de columna
- **THEN** la URL se actualiza con `?sort=<campo>&order=<asc|desc>` y el listado se reordena

### Requirement: Paginación de clientes
El sistema DEBE paginar los resultados del listado de clientes. El número de página DEBE reflejarse en el parámetro de URL `page`.

#### Scenario: Navegar entre páginas
- **WHEN** el usuario hace clic en un control de paginación
- **THEN** la URL se actualiza con `?page=<n>` y se muestran los clientes de esa página

### Requirement: Consultas eficientes
La búsqueda, filtros, ordenamiento y paginación DEBEN ejecutarse como consultas en PostgreSQL (Supabase), no filtrando datos en JavaScript del cliente.

#### Scenario: Consulta server-side
- **WHEN** la página se carga con parámetros de búsqueda/filtro/paginación
- **THEN** el Server Component construye la consulta Supabase con WHERE, ORDER BY y RANGE según los parámetros de URL

### Requirement: Seguridad RLS en clientes
La tabla `clients` DEBE tener políticas de Row Level Security que permitan operaciones solo a usuarios autenticados.

#### Scenario: Acceso sin autenticación a nivel de base de datos
- **WHEN** una petición llega a Supabase sin token de autenticación válido
- **THEN** la base de datos rechaza la operación independientemente de lo que permita el frontend
