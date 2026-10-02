# Spec Delta

## MODIFIED Requirements

### Requirement: El sistema DEBE mostrar un gráfico de dona con la distribución de embarques por estado (Pendiente, En tránsito, Entregado, Retrasado, Cancelado). Los valores DEBEN calcularse desde la base de datos.
El sistema DEBE mostrar un gráfico de **dona** (PieChart con `innerRadius` > 0, ej. 60px) con la distribución de embarques por estado usando la **paleta de colores semántica**:
- **Entregado:** lime-500/lime-400 (éxito)
- **En tránsito:** amber-500 (advertencia/tránsito)
- **Pendiente:** slate-400 (neutral)
- **Retrasado:** red-500 (error/retraso)
- **Cancelado:** gray-500 (neutral/desactivado)
Los valores DEBEN calcularse desde la base de datos. El gráfico DEBE mostrar etiquetas con nombre y valor por segmento (ej. "Entregado: 10"). Las líneas de grilla DEBEN ser extremadamente tenues (punteadas, gris muy claro) o eliminadas.

#### Scenario: Donut chart renders with semantic colors and inner radius
- **WHEN** el usuario navega a `/dashboard` y existen embarques
- **THEN** el sistema muestra un gráfico de dona con un segmento por estado usando colores semánticos y `innerRadius` visible
- **THEN** cada segmento muestra su etiqueta con nombre y cantidad

#### Scenario: Donut chart empty state
- **WHEN** el usuario navega a `/dashboard` y no existen embarques
- **THEN** el gráfico muestra un estado vacío con un mensaje apropiado

### Requirement: El sistema DEBE mostrar un gráfico de barras con la cantidad de embarques por modalidad (FCL, LCL, AIR). Los valores DEBEN calcularse desde la base de datos.
El sistema DEBE mostrar un gráfico de barras con **barras más gruesas** (`barSize={40}`) y **bordes redondeados superiores** (`radius={[4, 4, 0, 0]}`) para cada modalidad (FCL, LCL, AIR), usando **colores semánticos distintos** por modalidad (ej. FCL → lime-500, LCL → amber-500, AIR → blue-500). Los valores DEBEN calcularse desde la base de datos. Las líneas de grilla DEBEN ser extremadamente tenues (punteadas, gris muy claro) o eliminadas. Los ejes DEBEN simplificarse (ocultar líneas de eje, usar solo grilla punteada sutil).

#### Scenario: Bar chart renders with thick rounded bars and semantic colors
- **WHEN** el usuario navega a `/dashboard` y existen embarques
- **THEN** el sistema muestra un gráfico de barras con `barSize={40}` y `radius={[4, 4, 0, 0]}`
- **THEN** cada barra usa un color semántico distinto por modalidad

#### Scenario: Bar chart empty state
- **WHEN** el usuario navega a `/dashboard` y no existen embarques
- **THEN** el gráfico muestra un estado vacío con un mensaje apropiado

### Requirement: El sistema DEBE mostrar un gráfico de área con el volumen de embarques creados por mes. Los valores DEBEN calcularse desde la base de datos.
El sistema DEBE mostrar un gráfico de área con **relleno de gradiente lineal** (`<defs><linearGradient>`) usando el color de acento primario (lime-500) a opacidad ~0.3 en la parte superior desvaneciéndose a transparente en la base. La línea DEBE usar `type="monotone"` para curvas suaves. Los valores DEBEN calcularse desde la base de datos. Las líneas de grilla DEBEN ser extremadamente tenues (punteadas, gris muy claro) o eliminadas. Los ejes DEBEN simplificarse.

#### Scenario: Area chart renders with gradient fill and monotone smoothing
- **WHEN** el usuario navega a `/dashboard` y existen embarques
- **THEN** el sistema muestra un gráfico de área con gradiente lime-500 → transparente
- **THEN** la línea usa `type="monotone"` para suavizado
- **THEN** el trazo (stroke) y relleno (fill) usan el color semántico primario

#### Scenario: Area chart empty state
- **WHEN** el usuario navega a `/dashboard` y no existen embarques
- **THEN** el gráfico muestra un estado vacío con un mensaje apropiado

### Requirement: Los datos para los gráficos DEBEN obtenerse en un Server Component para garantizar SSR.
Los datos para los gráficos DEBEN obtenerse en un Server Component para garantizar SSR. (Sin cambios en el comportamiento de obtención de datos).

#### Scenario: Chart data fetched server-side
- **WHEN** se carga la página `/dashboard`
- **THEN** los datos de los gráficos se obtienen desde el servidor antes del renderizado

### Requirement: Los gráficos DEBEN adaptarse al viewport: apilados en mobile y en grid en desktop.
Los gráficos DEBEN adaptarse al viewport siguiendo la arquitectura **Bento Box**:
- **Mobile (< 768px):** Layout de una sola columna (`grid-cols-1`), gráficos con altura ~250px, Sidebar oculto (Drawer/Sheet via botón hamburguesa).
- **Tablet (768px–1023px):** Layout de 2 columnas (`grid-cols-2`), KPIs en `col-span-1`, gráfico de área a ancho completo (`col-span-2`), dona/barras apilados.
- **Desktop (≥ 1024px):** Grid de 3 columnas (`grid-cols-3`) según distribución Bento: columnas 1-2 para KPIs + timeline, columna 3 para dona + barras apiladas. Altura de gráficos ~280px en desktop.

#### Scenario: Mobile viewport stacks charts
- **WHEN** el viewport es menor a 768px
- **THEN** los gráficos se muestran apilados en una columna con altura ~250px
- **THEN** el Sidebar es un Drawer accesible desde el Header

#### Scenario: Tablet viewport uses 2-column grid
- **WHEN** el viewport es 768px–1023px
- **THEN** los gráficos usan grid de 2 columnas con timeline a ancho completo

#### Scenario: Desktop viewport uses 3-column Bento grid
- **WHEN** el viewport es mayor o igual a 1024px
- **THEN** los gráficos usan grid de 3 columnas con distribución Bento (KPIs+timeline span 2, dona+barras span 1)
- **THEN** altura de gráficos ~280px

### Requirement: Los gráficos DEBEN mostrar skeletons durante la carga y un mensaje de error si la consulta falla.
Los gráficos DEBEN mostrar skeletons durante la carga y un mensaje de error si la consulta falla. (Sin cambios en el comportamiento de carga/error).

#### Scenario: Skeletons during chart loading
- **WHEN** se está obteniendo los datos de los gráficos
- **THEN** se muestran skeletons en lugar de los gráficos

#### Scenario: Error message on chart query failure
- **WHEN** la consulta de datos de gráficos falla
- **THEN** se muestra un mensaje de error con opción de reintentar