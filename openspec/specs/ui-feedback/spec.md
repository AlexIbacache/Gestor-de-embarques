# ui-feedback Specification

## Purpose
Define los estados de carga a nivel de ruta y la consistencia del feedback de las operaciones de escritura, para que el usuario siempre sepa qué está ocurriendo y nunca pueda disparar acciones duplicadas.

## Requirements

### Requirement: Estados de carga a nivel de ruta
Las rutas `/dashboard`, `/clientes`, `/embarques` y `/embarques/[id]` DEBEN mostrar una UI de carga a nivel de ruta basada en skeletons que anticipe la estructura del contenido mientras se obtienen los datos. NINGUNA de estas rutas DEBE mostrar como único indicador un texto de "Cargando...".

#### Scenario: Carga del dashboard
- **WHEN** el usuario navega a `/dashboard` y los datos aún se están obteniendo
- **THEN** la ruta muestra skeletons con la estructura de KPIs, gráficos y listado

#### Scenario: Carga de listados
- **WHEN** el usuario navega a `/clientes` o `/embarques` y los datos aún se están obteniendo
- **THEN** la ruta muestra skeletons con la estructura del listado correspondiente

#### Scenario: Carga del detalle
- **WHEN** el usuario navega a `/embarques/[id]` y los datos aún se están obteniendo
- **THEN** la ruta muestra un skeleton con la estructura del detalle del embarque

### Requirement: Feedback de operaciones de escritura
Toda operación de escritura (crear, editar, eliminar clientes y embarques, iniciar sesión y cerrar sesión) DEBE mostrar un estado pendiente mientras se ejecuta, con los controles involucrados deshabilitados para prevenir envíos duplicados, y un toast al completarse con éxito o con error. El cierre de sesión NO DEBE ejecutarse en silencio.

#### Scenario: Operación en progreso
- **WHEN** el usuario dispara una operación de escritura
- **THEN** los controles involucrados muestran estado pendiente y rechazan envíos adicionales hasta que la operación termina

#### Scenario: Logout con feedback
- **WHEN** el usuario hace clic en "Cerrar sesión"
- **THEN** el control muestra estado pendiente durante el cierre y, al completarse, el sistema muestra un toast de confirmación y redirige a `/login`

#### Scenario: Error con feedback
- **WHEN** una operación de escritura falla
- **THEN** el sistema muestra un toast con un mensaje de error comprensible y los controles vuelven a su estado habilitado

### Requirement: Confirmación de operaciones destructivas
Las eliminaciones DEBEN requerir un diálogo de confirmación explícito antes de ejecutarse. Las ediciones NO DEBEN requerir un modal de confirmación adicional: el diálogo de formulario es la superficie de confirmación explícita, donde el usuario revisa los datos y confirma con la acción de guardar.

#### Scenario: Eliminación requiere confirmación
- **WHEN** el usuario solicita eliminar un registro
- **THEN** el sistema muestra un diálogo de confirmación y solo ejecuta la eliminación si el usuario la confirma

#### Scenario: Edición sin modal adicional
- **WHEN** el usuario edita un registro y confirma con la acción de guardar del formulario
- **THEN** el sistema persiste los cambios directamente, sin interponer un segundo diálogo de confirmación
