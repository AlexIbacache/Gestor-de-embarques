# Spec Delta

## MODIFIED Requirements

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
