# Spec Delta

## MODIFIED Requirements

### Requirement: Corporate brand palette
La aplicación DEBE usar una paleta corporativa de identidad logística: primario azul marino/acero profundo, acento ámbar y neutros pizarra, definida con tokens oklch para los temas claro y oscuro. Los roles semánticos (fondo, superficie, texto, borde, ring, sidebar, gráficos y estados) DEBEN derivar de esta paleta.

#### Scenario: Corporate primary color
- **WHEN** se renderiza cualquier elemento de acción primaria (botón primario, enlace activo, anillo de foco)
- **THEN** usa el token de primario azul marino/acero de la paleta logística

#### Scenario: Sky accent
- **WHEN** se renderiza una superficie o elemento de acento (ítem activo de sidebar, resaltado suave)
- **THEN** usa el token de acento ámbar de la paleta logística

#### Scenario: White and gray neutrals
- **WHEN** se renderizan superficies neutras, fondos, bordes o texto secundario
- **THEN** usan los neutros pizarra de la paleta, con la superficie de tarjeta diferenciada del fondo del shell

## ADDED Requirements

### Requirement: Selección de tema claro/oscuro
La aplicación DEBE permitir elegir entre tema claro, tema oscuro y tema del sistema, siendo el tema del sistema el valor por defecto. La elección DEBE persistir entre sesiones y aplicarse sin parpadeo ni transiciones bruscas al cambiar. El control de cambio de tema DEBE estar disponible en el header del área privada.

#### Scenario: Tema del sistema por defecto
- **WHEN** un usuario sin preferencia guardada abre la aplicación
- **THEN** la aplicación renderiza el tema que coincide con la preferencia del sistema operativo

#### Scenario: Cambio de tema manual
- **WHEN** el usuario activa el control de tema en el header
- **THEN** la aplicación alterna entre claro y oscuro aplicando los tokens del tema elegido en toda la interfaz

#### Scenario: Preferencia persistida
- **WHEN** el usuario recarga la página o vuelve en otra sesión
- **THEN** la aplicación aplica la última elección de tema sin parpadeo del tema contrario

### Requirement: Gráficos legibles en ambos temas
Los colores de los gráficos del dashboard DEBEN resolverse desde los tokens del tema activo, de modo que dona, barras y área mantengan legibilidad y significado semántico en el tema claro y en el oscuro.

#### Scenario: Gráficos en tema oscuro
- **WHEN** el usuario navega a `/dashboard` con el tema oscuro activo
- **THEN** los segmentos, barras, líneas, grillas y etiquetas de los gráficos mantienen contraste legible y los colores de estado conservan su significado

#### Scenario: Cambio de tema con gráficos renderizados
- **WHEN** el usuario alterna el tema con el dashboard ya renderizado
- **THEN** los gráficos adoptan los colores del nuevo tema sin requerir recarga manual
