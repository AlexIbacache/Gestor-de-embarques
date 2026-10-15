# clients Specification

## Purpose
Gestiona el ciclo de vida de los clientes: creación, edición, listado con búsqueda, ordenamiento y paginación.

## Requirements

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
El sistema DEBE permitir buscar clientes por nombre, email o empresa. El término de búsqueda DEBE reflejarse en el parámetro de URL `search`. El término DEBE tratarse como texto literal: los caracteres con significado especial en la sintaxis de consulta de PostgREST (comillas dobles, barra invertida, comas, puntos, dos puntos, paréntesis) NO DEBEN romper la consulta ni alterar su semántica.

#### Scenario: Búsqueda con resultados
- **WHEN** el usuario escribe un término en el campo de búsqueda
- **THEN** la URL se actualiza con `?search=<término>` y el listado muestra solo los clientes que coinciden

#### Scenario: Búsqueda sin resultados
- **WHEN** el usuario busca un término sin coincidencias
- **THEN** el sistema muestra un estado vacío indicando que no se encontraron resultados

#### Scenario: Búsqueda con caracteres especiales
- **WHEN** el usuario busca un término que contiene caracteres especiales de la sintaxis de PostgREST (por ejemplo `"`, `\`, `,`, `.`, `:`, `(`, `)`)
- **THEN** la consulta se ejecuta sin errores y el término se interpreta como texto literal, sin coincidencias inesperadas ni resultados rotos

### Requirement: Ordenamiento de clientes
El sistema DEBE permitir ordenar el listado de clientes por nombre, email, empresa o fecha de creación. Los parámetros `sort` y `order` DEBEN reflejarse en la URL.

#### Scenario: Cambiar ordenamiento
- **WHEN** el usuario hace clic en un encabezado de columna
- **THEN** la URL se actualiza con `?sort=<campo>&order=<asc|desc>` y el listado se reordena

### Requirement: Paginación de clientes
El sistema DEBE paginar los resultados del listado de clientes. El número de página DEBE reflejarse en el parámetro de URL `page` y el tamaño de página en el parámetro de URL `pageSize`, con opciones de 10, 25 o 50 registros por página (10 por defecto). La paginación DEBE ofrecer páginas numeradas con elipsis cuando la cantidad de páginas lo amerite, además de los controles anterior/siguiente. Si `page` excede el total de páginas disponibles, el servidor DEBE normalizar la navegación redirigiendo a la última página válida en lugar de renderizar un listado vacío.

#### Scenario: Navegar entre páginas
- **WHEN** el usuario hace clic en un número de página o en anterior/siguiente
- **THEN** la URL se actualiza con `?page=<n>` y se muestran los clientes de esa página

#### Scenario: Cambiar tamaño de página
- **WHEN** el usuario selecciona otro tamaño de página
- **THEN** la URL se actualiza con `?pageSize=<10|25|50>`, la página vuelve a 1 y el listado muestra la cantidad elegida

#### Scenario: Página fuera de rango
- **WHEN** la URL contiene un `page` mayor que el total de páginas (por ejemplo `?page=999` con 3 páginas)
- **THEN** el sistema redirige a la última página válida y muestra sus registros en lugar de un listado vacío

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

### Requirement: Eliminar cliente
El sistema DEBE permitir eliminar un cliente, requiriendo confirmación explícita mediante un diálogo antes de ejecutar la eliminación. Si el cliente tiene embarques asociados, la eliminación DEBE ser rechazada por la restricción de clave foránea y el sistema DEBE mostrar un mensaje de error comprensible que indique la causa, sin eliminar nada.

#### Scenario: Eliminación confirmada
- **WHEN** el usuario confirma la eliminación de un cliente sin embarques asociados
- **THEN** el sistema elimina el registro, revalida la página y muestra un toast de confirmación

#### Scenario: Eliminación cancelada
- **WHEN** el usuario cancela el diálogo de confirmación de eliminación
- **THEN** el sistema no elimina el registro y cierra el diálogo

#### Scenario: Cliente con embarques asociados
- **WHEN** el usuario confirma la eliminación de un cliente que todavía tiene embarques asociados
- **THEN** la base de datos rechaza la operación y el sistema muestra un mensaje indicando que el cliente tiene embarques asociados y no puede eliminarse

### Requirement: Filtro por fecha de creación de clientes
El sistema DEBE permitir filtrar el listado de clientes por rango de fecha de creación. Los límites del rango DEBEN reflejarse en los parámetros de URL `from` y `to` con formato AAAA-MM-DD, y DEBEN combinarse con la búsqueda, el ordenamiento y la paginación.

#### Scenario: Filtrar por rango de fechas
- **WHEN** el usuario selecciona una fecha de inicio y/o una fecha de fin
- **THEN** la URL se actualiza con `?from=<fecha>&to=<fecha>` y el listado muestra solo los clientes creados dentro del rango

#### Scenario: Rango combinado con otros parámetros
- **WHEN** el usuario combina búsqueda, rango de fechas, ordenamiento y paginación
- **THEN** todos los parámetros se reflejan en la URL y la consulta los aplica simultáneamente
