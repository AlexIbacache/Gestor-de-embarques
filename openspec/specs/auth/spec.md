# auth Specification

## Purpose
Gestiona la autenticación de usuarios mediante Supabase Auth, protegiendo las rutas privadas de la aplicación y controlando el acceso mediante middleware.

## Requirements

### Requirement: Login con email y password
El sistema DEBE permitir a los usuarios iniciar sesión con email y contraseña a través de Supabase Auth. Tras un login exitoso, el sistema DEBE redirigir al destino indicado por el parámetro de URL `next` cuando exista y sea una ruta interna válida; en caso contrario DEBE redirigir a `/dashboard`. Un `next` válido DEBE comenzar con `/` y NO DEBE comenzar con `//`; cualquier otro valor (URL absoluta, protocolo relativo, esquema externo) DEBE descartarse.

#### Scenario: Login exitoso
- **WHEN** el usuario ingresa credenciales válidas en `/login` y envía el formulario sin parámetro `next`
- **THEN** el sistema autentica al usuario, crea una sesión y redirige a `/dashboard`

#### Scenario: Login exitoso con destino previo
- **WHEN** el usuario ingresa credenciales válidas y la URL incluye un `next` interno (por ejemplo `?next=/embarques`)
- **THEN** el sistema autentica al usuario, crea una sesión y redirige a la ruta indicada por `next`

#### Scenario: Destino `next` inválido
- **WHEN** el usuario ingresa credenciales válidas y `next` no es una ruta interna válida (por ejemplo `//sitio-externo.com` o `https://sitio-externo.com`)
- **THEN** el sistema descarta `next` y redirige a `/dashboard`

#### Scenario: Login fallido
- **WHEN** el usuario ingresa credenciales inválidas
- **THEN** el sistema muestra un mensaje de error y no crea sesión

### Requirement: Logout
El sistema DEBE permitir al usuario cerrar sesión, destruyendo la sesión activa.

#### Scenario: Cerrar sesión
- **WHEN** el usuario hace clic en "Cerrar sesión"
- **THEN** el sistema destruye la sesión y redirige a `/login`

### Requirement: Protección de rutas
El sistema DEBE proteger las rutas `/dashboard`, `/clientes` y `/embarques` mediante middleware que verifica la existencia de una sesión activa.

#### Scenario: Acceso sin sesión
- **WHEN** un usuario no autenticado intenta acceder a una ruta protegida
- **THEN** el sistema redirige a `/login`

#### Scenario: Acceso con sesión válida
- **WHEN** un usuario autenticado accede a una ruta protegida
- **THEN** el sistema permite el acceso y renderiza la página

### Requirement: Ruta pública de login
La ruta `/login` DEBE ser accesible sin autenticación. Si el usuario ya tiene sesión activa, DEBE ser redirigido a `/dashboard`.

#### Scenario: Usuario autenticado visita login
- **WHEN** un usuario con sesión activa navega a `/login`
- **THEN** el sistema redirige a `/dashboard`

### Requirement: Verificación de sesión en Server Actions
Todas las Server Actions que realizan operaciones de escritura DEBEN verificar que existe una sesión activa antes de ejecutarse.

#### Scenario: Server Action sin sesión
- **WHEN** una Server Action recibe una petición sin sesión válida
- **THEN** el sistema rechaza la operación con un error de autenticación

### Requirement: Variables de entorno seguras
El sistema DEBE utilizar variables de entorno para las credenciales de Supabase. NUNCA DEBE exponer `service_role` ni secretos privilegiados en Client Components.

#### Scenario: Credenciales en cliente
- **WHEN** se renderiza un Client Component
- **THEN** solo las variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` están disponibles
