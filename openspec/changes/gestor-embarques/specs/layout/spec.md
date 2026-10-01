# Spec Delta

## Purpose

Define el layout compartido de la aplicación: sidebar de navegación, header con información del usuario, navegación móvil y diseño responsive para desktop, tablet y mobile.

## ADDED Requirements

### Requirement: Sidebar de navegación en desktop
El sistema DEBE mostrar una sidebar fija en desktop con el logo de la aplicación y enlaces a: Dashboard, Clientes, Embarques. También DEBE incluir información del usuario y opción de cerrar sesión.

#### Scenario: Navegación desde sidebar
- **WHEN** el usuario hace clic en un enlace de la sidebar
- **THEN** el sistema navega a la ruta correspondiente y marca el enlace activo

### Requirement: Header
El sistema DEBE mostrar un header con búsqueda rápida y la información del usuario autenticado (nombre o email).

#### Scenario: Header con usuario
- **WHEN** se renderiza una página protegida
- **THEN** el header muestra la información del usuario autenticado

### Requirement: Navegación móvil
En viewports mobile, la sidebar DEBE reemplazarse por una navegación móvil (hamburger menu o bottom nav) accesible mediante un Sheet/Drawer.

#### Scenario: Menú móvil
- **WHEN** el usuario abre el menú en mobile
- **THEN** se despliega un panel con los mismos enlaces de navegación

### Requirement: Diseño responsive
El layout DEBE adaptarse a tres breakpoints: desktop (sidebar visible, tabla completa), tablet (espacios y columnas adaptados) y mobile (navegación móvil, cards, botones accesibles).

#### Scenario: Transición desktop a mobile
- **WHEN** el viewport cambia de desktop a mobile
- **THEN** la sidebar se oculta y aparece la navegación móvil

### Requirement: Sin overflow horizontal
El layout NO DEBE producir overflow horizontal innecesario, espacios vacíos excesivos, botones demasiado pequeños ni contenido ilegible en ningún breakpoint.

#### Scenario: Verificación de overflow
- **WHEN** la aplicación se visualiza en cualquier dispositivo soportado
- **THEN** no existe scroll horizontal innecesario y todos los elementos interactivos son usables

### Requirement: Estados de UX globales
Las páginas DEBEN considerar los estados: loading (skeletons), empty (mensaje + acción), error (mensaje + reintentar) y operación en progreso (botones deshabilitados).

#### Scenario: Estado de carga
- **WHEN** una página está cargando datos
- **THEN** el sistema muestra skeletons en lugar de texto "Cargando..."

#### Scenario: Error de carga
- **WHEN** una consulta falla
- **THEN** el sistema muestra un mensaje de error con opción de reintentar

### Requirement: Feedback con toasts
Las operaciones exitosas y fallidas DEBEN mostrar notificaciones toast al usuario (crear, editar, eliminar).

#### Scenario: Toast de éxito
- **WHEN** una operación de escritura se completa exitosamente
- **THEN** el sistema muestra un toast con mensaje de confirmación

#### Scenario: Toast de error
- **WHEN** una operación de escritura falla
- **THEN** el sistema muestra un toast con mensaje de error

### Requirement: Animaciones moderadas
El sistema DEBE usar Motion para transiciones suaves en la aparición de contenido, dialogs y cards. Las animaciones NO DEBEN distraer ni aplicarse a absolutamente todo.

#### Scenario: Animación de entrada
- **WHEN** un componente aparece en pantalla (card, dialog, contenido de página)
- **THEN** se aplica una transición suave de opacidad y/o posición
