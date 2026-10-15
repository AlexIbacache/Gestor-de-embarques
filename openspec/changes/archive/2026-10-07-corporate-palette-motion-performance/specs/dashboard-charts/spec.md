# Spec Delta

## MODIFIED Requirements

### Requirement: Embarques por estado
El sistema DEBE mostrar un gráfico de **dona** (PieChart con `innerRadius` > 0, ej. 60px) con la distribución de embarques por estado usando la **paleta corporativa** definida en la capacidad `theme-palette` (mapa central `chart-colors.ts`):
- **Entregado:** verde de éxito (`--success`)
- **En tránsito:** celeste (`--chart-2`)
- **Pendiente:** gris neutro (`--neutral`)
- **Retrasado:** rojo de peligro (`--danger`)
- **Cancelado:** gris atenuado (`--muted-foreground`)
Los valores DEBEN calcularse desde la base de datos. El gráfico DEBE mostrar etiquetas con nombre y valor por segmento (ej. "Entregado: 10"). Las líneas de grilla DEBEN ser extremadamente tenues (punteadas, gris muy claro) o eliminadas.

#### Scenario: Gráfico por estado con datos
- **WHEN** el usuario navega a `/dashboard` y existen embarques
- **THEN** el sistema muestra un gráfico de dona con un segmento por estado y su cantidad

#### Scenario: Gráfico por estado sin datos
- **WHEN** el usuario navega a `/dashboard` y no existen embarques
- **THEN** el gráfico muestra un estado vacío con un mensaje apropiado

#### Scenario: Donut chart renders with semantic colors and inner radius
- **WHEN** el usuario navega a `/dashboard` y existen embarques
- **THEN** el sistema muestra un gráfico de dona con un segmento por estado usando la paleta corporativa y `innerRadius` visible
- **THEN** cada segmento muestra su etiqueta con nombre y cantidad

#### Scenario: Donut chart empty state
- **WHEN** el usuario navega a `/dashboard` y no existen embarques
- **THEN** el gráfico muestra un estado vacío con un mensaje apropiado

### Requirement: Embarques por modalidad
El sistema DEBE mostrar un gráfico de barras con **barras más gruesas** (`barSize={40}`) y **bordes redondeados superiores** (`radius={[4, 4, 0, 0]}`) para cada modalidad (FCL, LCL, AIR), usando **colores corporativos distintos** por modalidad (FCL → azul primario `--chart-1`, LCL → celeste `--chart-2`, AIR → gris `--chart-4`). Los valores DEBEN calcularse desde la base de datos. Las líneas de grilla DEBEN ser extremadamente tenues (punteadas, gris muy claro) o eliminadas. Los ejes DEBEN simplificarse (ocultar líneas de eje, usar solo grilla punteada sutil).

#### Scenario: Gráfico por modalidad con datos
- **WHEN** el usuario navega a `/dashboard` y existen embarques
- **THEN** el sistema muestra un gráfico de barras con una barra por modalidad

#### Scenario: Gráfico por modalidad sin datos
- **WHEN** el usuario navega a `/dashboard` y no existen embarques
- **THEN** el gráfico muestra un estado vacío con un mensaje apropiado

#### Scenario: Bar chart renders with thick rounded bars and semantic colors
- **WHEN** el usuario navega a `/dashboard` y existen embarques
- **THEN** el sistema muestra un gráfico de barras con `barSize={40}` y `radius={[4, 4, 0, 0]}`
- **THEN** cada barra usa un color corporativo distinto por modalidad

#### Scenario: Bar chart empty state
- **WHEN** el usuario navega a `/dashboard` y no existen embarques
- **THEN** el gráfico muestra un estado vacío con un mensaje apropiado

### Requirement: Embarques en el tiempo
El sistema DEBE mostrar un gráfico de área con **relleno de gradiente lineal** (`<defs><linearGradient>`) usando el color primario corporativo (azul, `--primary` de `theme-palette`) a opacidad ~0.3 en la parte superior desvaneciéndose a transparente en la base. La línea DEBE usar `type="monotone"` para curvas suaves. Los valores DEBEN calcularse desde la base de datos. Las líneas de grilla DEBEN ser extremadamente tenues (punteadas, gris muy claro) o eliminadas. Los ejes DEBEN simplificarse.

#### Scenario: Gráfico temporal con datos
- **WHEN** el usuario navega a `/dashboard` y existen embarques
- **THEN** el sistema muestra un gráfico de área con un punto por mes

#### Scenario: Gráfico temporal sin datos
- **WHEN** el usuario navega a `/dashboard` y no existen embarques
- **THEN** el gráfico muestra un estado vacío con un mensaje apropiado

#### Scenario: Area chart renders with gradient fill and monotone smoothing
- **WHEN** el usuario navega a `/dashboard` y existen embarques
- **THEN** el sistema muestra un gráfico de área con gradiente del primario corporativo → transparente
- **THEN** la línea usa `type="monotone"` para suavizado
- **THEN** el trazo (stroke) y relleno (fill) usan el color primario corporativo

#### Scenario: Area chart empty state
- **WHEN** el usuario navega a `/dashboard` y no existen embarques
- **THEN** el gráfico muestra un estado vacío con un mensaje apropiado
