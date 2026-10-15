# Spec Delta

## MODIFIED Requirements

### Requirement: Dashboard incluye gráficos de datos relevantes
El dashboard DEBE organizar su contenido en una arquitectura modular usando CSS Grid con las siguientes restricciones de layout:
- **Desktop (xl+):** Los KPIs ocupan una fila de 3 columnas; debajo, un grid asimétrico de 2 columnas (`xl:grid-cols-[1.5fr_1fr]`) con el gráfico de dona (estado) en la columna ancha y el gráfico de barras (modalidad) en la columna angosta; el gráfico de área (timeline) y el listado de últimos embarques ocupan el ancho completo debajo.
- **Tablet (md hasta xl):** Los KPIs ocupan una fila de 3 columnas (`md:grid-cols-3`) y los gráficos se apilan en una sola columna.
- **Mobile (< md):** Layout de una sola columna con todos los módulos apilados verticalmente.
- **Contenedor máximo:** El área de contenido DEBE limitarse a `max-w-[1600px]` centrado en pantallas ultra anchas.
- **Espaciado consistente:** Gap uniforme entre módulos (`gap-4`/`gap-5`/`gap-6` según la sección) y padding de `p-5`/`md:p-8` alrededor del área de contenido principal.
- **Fondo del App Shell:** El shell del área privada define un único fondo mediante el token semántico de fondo; las páginas NO DEBEN re-envolver su propio fondo y las tarjetas DEBEN usar el token semántico de superficie, con contraste garantizado en ambos temas.
- **Tarjetas elevadas:** Todas las tarjetas DEBEN usar la superficie semántica de tarjeta, sin bordes visibles, `rounded-2xl` y sombra suave (`shadow-sm` o equivalente).
- **Jerarquía tipográfica:** KPIs en `text-3xl`/`text-4xl` `font-bold`, títulos de tarjetas en `text-sm`/`text-base` `font-medium`, etiquetas en `text-xs`/`text-sm` con `uppercase tracking-wider` y color mutado.
- **Iconos semánticos en KPIs:** Cada stat card DEBE incluir un ícono semántico dentro de un fondo tintado acorde a su significado.
- **Animaciones sutiles:** Tarjetas interactivas DEBEN responder a hover con elevación/escalado sutil, sin distraer.
- **Sidebar:** Superficie semántica, indicadores de estado activo sutiles (línea izquierda o cambio de color), sin fondo gris oscuro.
- **Header:** Búsqueda global accesible en todos los breakpoints, perfil de usuario a la derecha.
- **Datos en Server Component:** Los gráficos y stat cards DEBEN obtener sus datos en el mismo Server Component para garantizar SSR.

#### Scenario: Dashboard con gráficos y stat cards
- **WHEN** el usuario navega a `/dashboard`
- **THEN** el sistema muestra las stat cards y los gráficos de datos relevantes en la misma vista

#### Scenario: Desktop Bento layout renders correctly
- **WHEN** el usuario navega a `/dashboard` en viewport ≥ 1280px
- **THEN** el sistema muestra los KPIs en una fila de 3 columnas, la dona y las barras en el grid asimétrico (columna ancha 1.5fr para la dona, columna angosta 1fr para las barras) y el timeline a ancho completo debajo

#### Scenario: Tablet layout adapts correctly
- **WHEN** el usuario navega a `/dashboard` en viewport 768px–1279px
- **THEN** el sistema muestra los KPIs en fila de 3 columnas y los gráficos apilados en una sola columna

#### Scenario: Mobile layout stacks correctly
- **WHEN** el usuario navega a `/dashboard` en viewport < 768px
- **THEN** el sistema muestra una sola columna con todos los módulos apilados verticalmente
- **THEN** el Sidebar se oculta y pasa a ser un Drawer (Sheet) accionado por botón hamburguesa en el Header

#### Scenario: Max-width constraint on ultra-wide screens
- **WHEN** el viewport supera 1600px de ancho
- **THEN** el contenido del dashboard permanece centrado a 1600px máximo con márgenes iguales

#### Scenario: Data fetched in Server Component
- **WHEN** se carga la página `/dashboard`
- **THEN** los datos de stat cards y gráficos se obtienen desde el servidor antes del renderizado

## ADDED Requirements

### Requirement: Agregación de estadísticas en base de datos
Los conteos por estado, los conteos por modalidad y los buckets mensuales del timeline DEBEN calcularse en PostgreSQL mediante una única consulta de agregación invocada desde el servidor, que devuelva resultados pre-agregados. La página NO DEBE descargar filas crudas de embarques para agregarlas en JavaScript. Los buckets mensuales DEBEN identificarse por su clave de mes (AAAA-MM) y renderizarse como fecha de calendario local, de modo que el mes mostrado sea correcto también en zonas horarias UTC negativas.

#### Scenario: Estadísticas pre-agregadas
- **WHEN** se carga la página `/dashboard` con embarques registrados
- **THEN** la respuesta de la consulta de agregación contiene conteos y buckets ya calculados, sin transferir filas individuales de embarques al cliente

#### Scenario: Meses correctos en zona horaria negativa
- **WHEN** el usuario navega a `/dashboard` desde una zona horaria UTC negativa (por ejemplo UTC-3) y existen embarques creados en meses distintos
- **THEN** el gráfico de área etiqueta cada punto con el mes calendario correcto, sin corrimientos al mes anterior

#### Scenario: Base de datos vacía
- **WHEN** se carga la página `/dashboard` sin embarques registrados
- **THEN** la consulta de agregación devuelve conteos en cero y los gráficos muestran sus estados vacíos

### Requirement: Manejo de errores del dashboard
Cuando una consulta del dashboard falla, el sistema DEBE mostrar un mensaje de error en español, comprensible para el usuario y consistente con los mensajes mapeados de las Server Actions. El sistema NUNCA DEBE renderizar el mensaje técnico crudo devuelto por Supabase o PostgreSQL.

#### Scenario: Error de consulta
- **WHEN** la consulta de datos del dashboard falla
- **THEN** el sistema muestra un mensaje de error amable en español con opción de reintentar

#### Scenario: Sin mensajes técnicos crudos
- **WHEN** ocurre cualquier error de base de datos en el dashboard
- **THEN** la interfaz no muestra el mensaje crudo del servidor (detalles técnicos, códigos o trazas), solo el mensaje mapeado para el usuario
