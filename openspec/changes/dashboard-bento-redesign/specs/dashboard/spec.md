# Spec Delta

## MODIFIED Requirements

### Requirement: El dashboard DEBE mostrar los gráficos definidos en la capacidad `dashboard-charts` junto a las stat cards existentes. Los gráficos DEBEN obtenerse en el mismo Server Component que las stat cards.
El dashboard DEBE organizar su contenido en una arquitectura Bento Box modular usando CSS Grid con las siguientes restricciones de layout:
- **Desktop (lg+):** Grid de 3 columnas (`grid-cols-3`) donde las columnas 1-2 abarcan la fila de KPIs y el gráfico de área (timeline), y la columna 3 apila verticalmente el gráfico de dona (estado) y el gráfico de barras (modalidad).
- **Tablet (md):** Grid de 2 columnas (`grid-cols-2`) donde los KPIs ocupan una fila, el gráfico de área abarca ambas columnas, y los gráficos de dona/barras se apilan en la segunda columna.
- **Mobile (< md):** Layout de una sola columna (`grid-cols-1`) con todos los módulos apilados verticalmente.
- **Contenedor máximo:** El área de contenido DEBE limitarse a `max-w-[1600px]` centrado en pantallas ultra anchas.
- **Espaciado consistente:** Gap de `gap-6` (24px) entre todos los módulos y padding de `p-6`/`p-8` alrededor del área de contenido principal.
- **Fondo del App Shell:** El contenedor principal DEBE usar `bg-slate-50` para contraste con las tarjetas blancas.
- **Tarjetas elevadas:** Todas las tarjetas DEBEN usar `bg-white`, sin bordes visibles, `rounded-2xl`/`rounded-[20px]`, y sombra suave (`shadow-sm` o `shadow-[0_8px_30px_rgb(0,0,0,0.04)]`).
- **Jerarquía tipográfica:** KPIs en `text-3xl`/`text-4xl` `font-bold`, títulos de tarjetas en `text-sm`/`text-base` `font-medium`, etiquetas en `text-xs`/`text-sm` con `uppercase tracking-wider` y color mutado.
- **Iconos semánticos en KPIs:** Cada stat card DEBE incluir un ícono semántico dentro de un fondo circular tintado (10% opacidad del color primario).
- **Animaciones sutiles:** Tarjetas interactivas DEBEN responder a hover con elevación/escalado sutil (`whileHover={{ scale: 1.01 }}` via Framer Motion).
- **Sidebar:** Fondo blanco, indicadores de estado activo sutiles (línea izquierda o cambio de color), sin fondo gris oscuro.
- **Header:** Fondo transparente/blanco, buscador centrado/izquierda con `rounded-full`/`rounded-xl`, `bg-gray-100` sin bordes, perfil usuario a la derecha.
- **Datos en Server Component:** Los gráficos y stat cards DEBEN obtener sus datos en el mismo Server Component para garantizar SSR.

#### Scenario: Desktop Bento layout renders correctly
- **WHEN** el usuario navega a `/dashboard` en viewport ≥ 1024px
- **THEN** el sistema muestra la estructura de 3 columnas con KPIs + timeline a la izquierda (span 2) y dona + barras apiladas a la derecha (span 1)

#### Scenario: Tablet layout adapts correctly
- **WHEN** el usuario navega a `/dashboard` en viewport 768px–1023px
- **THEN** el sistema muestra grid de 2 columnas con KPIs en fila, timeline a ancho completo, y dona/barras apilados

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