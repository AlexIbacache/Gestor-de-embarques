# Spec Delta

## MODIFIED Requirements

### Requirement: Búsqueda de embarques
El sistema DEBE permitir buscar embarques por referencia, cliente, origen o destino. El término DEBE reflejarse en el parámetro de URL `search`. El término DEBE tratarse como texto literal: los caracteres con significado especial en la sintaxis de consulta de PostgREST (comillas dobles, barra invertida, comas, puntos, dos puntos, paréntesis) NO DEBEN romper la consulta ni alterar su semántica.

#### Scenario: Búsqueda con resultados
- **WHEN** el usuario escribe un término en el campo de búsqueda
- **THEN** la URL se actualiza con `?search=<término>` y el listado filtra por coincidencias

#### Scenario: Búsqueda con caracteres especiales
- **WHEN** el usuario busca un término que contiene caracteres especiales de la sintaxis de PostgREST (por ejemplo `"`, `\`, `,`, `.`, `:`, `(`, `)`)
- **THEN** la consulta se ejecuta sin errores y el término se interpreta como texto literal, sin coincidencias inesperadas ni resultados rotos

### Requirement: Ordenamiento de embarques
El sistema DEBE permitir ordenar embarques por referencia, cliente, origen, destino, estado, ETA o fecha de creación. Los parámetros `sort` y `order` DEBEN reflejarse en la URL. Cada columna ordenable DEBE tener un encabezado interactivo (enlace o botón) que indique visualmente el campo y la dirección de ordenamiento activos, en paridad de comportamiento con el listado de clientes.

#### Scenario: Cambiar ordenamiento
- **WHEN** el usuario hace clic en un encabezado de columna ordenable
- **THEN** la URL se actualiza y el listado se reordena según el campo y dirección seleccionados

#### Scenario: Indicador de ordenamiento activo
- **WHEN** el listado está ordenado por un campo
- **THEN** el encabezado de esa columna muestra un indicador visual del campo y la dirección (ascendente o descendente) activos

#### Scenario: Alternar dirección
- **WHEN** el usuario hace clic en el encabezado del campo ya activo
- **THEN** la dirección de ordenamiento se invierte y la URL refleja el nuevo `order`

### Requirement: Paginación de embarques
El sistema DEBE paginar los resultados del listado. El número de página DEBE reflejarse en el parámetro de URL `page` y el tamaño de página en el parámetro de URL `pageSize`, con opciones de 10, 25 o 50 registros por página (10 por defecto). La paginación DEBE ofrecer páginas numeradas con elipsis cuando la cantidad de páginas lo amerite, además de los controles anterior/siguiente. Si `page` excede el total de páginas disponibles, el servidor DEBE normalizar la navegación redirigiendo a la última página válida en lugar de renderizar un listado vacío.

#### Scenario: Navegar entre páginas
- **WHEN** el usuario hace clic en un número de página o en anterior/siguiente
- **THEN** la URL se actualiza y se muestran los embarques de la página seleccionada

#### Scenario: Cambiar tamaño de página
- **WHEN** el usuario selecciona otro tamaño de página
- **THEN** la URL se actualiza con `?pageSize=<10|25|50>`, la página vuelve a 1 y el listado muestra la cantidad elegida

#### Scenario: Página fuera de rango
- **WHEN** la URL contiene un `page` mayor que el total de páginas (por ejemplo `?page=999` con 3 páginas)
- **THEN** el sistema redirige a la última página válida y muestra sus registros en lugar de un listado vacío
