# dashboard-charts Specification

## Purpose
Visualización de datos operativos del dashboard mediante gráficos que muestren la distribución y tendencia de los embarques.

## Requirements

### Requirement: Embarques por estado
El sistema DEBE mostrar un gráfico de dona con la distribución de embarques por estado (Pendiente, En tránsito, Entregado, Retrasado, Cancelado). Los valores DEBEN calcularse desde la base de datos.

#### Scenario: Gráfico por estado con datos
- **WHEN** el usuario navega a `/dashboard` y existen embarques
- **THEN** el sistema muestra un gráfico de dona con un segmento por estado y su cantidad

#### Scenario: Gráfico por estado sin datos
- **WHEN** el usuario navega a `/dashboard` y no existen embarques
- **THEN** el gráfico muestra un estado vacío con un mensaje apropiado

### Requirement: Embarques por modalidad
El sistema DEBE mostrar un gráfico de barras con la cantidad de embarques por modalidad (FCL, LCL, AIR). Los valores DEBEN calcularse desde la base de datos.

#### Scenario: Gráfico por modalidad con datos
- **WHEN** el usuario navega a `/dashboard` y existen embarques
- **THEN** el sistema muestra un gráfico de barras con una barra por modalidad

#### Scenario: Gráfico por modalidad sin datos
- **WHEN** el usuario navega a `/dashboard` y no existen embarques
- **THEN** el gráfico muestra un estado vacío con un mensaje apropiado

### Requirement: Embarques en el tiempo
El sistema DEBE mostrar un gráfico de área con el volumen de embarques creados por mes. Los valores DEBEN calcularse desde la base de datos.

#### Scenario: Gráfico temporal con datos
- **WHEN** el usuario navega a `/dashboard` y existen embarques
- **THEN** el sistema muestra un gráfico de área con un punto por mes

#### Scenario: Gráfico temporal sin datos
- **WHEN** el usuario navega a `/dashboard` y no existen embarques
- **THEN** el gráfico muestra un estado vacío con un mensaje apropiado

### Requirement: Datos de gráficos obtenidos en servidor
Los datos para los gráficos DEBEN obtenerse en un Server Component para garantizar SSR.

#### Scenario: Datos de gráficos en servidor
- **WHEN** se carga la página `/dashboard`
- **THEN** los datos de los gráficos se obtienen desde el servidor antes del renderizado

### Requirement: Responsive de gráficos
Los gráficos DEBEN adaptarse al viewport: apilados en mobile y en grid en desktop.

#### Scenario: Gráficos en mobile
- **WHEN** el viewport es menor a 768px
- **THEN** los gráficos se muestran apilados en una columna

#### Scenario: Gráficos en desktop
- **WHEN** el viewport es mayor o igual a 1024px
- **THEN** los gráficos se muestran en un grid de dos columnas

### Requirement: Estados de carga y error de gráficos
Los gráficos DEBEN mostrar skeletons durante la carga y un mensaje de error si la consulta falla.

#### Scenario: Carga de gráficos
- **WHEN** se está obteniendo los datos de los gráficos
- **THEN** se muestran skeletons en lugar de los gráficos

#### Scenario: Error en gráficos
- **WHEN** la consulta de datos de gráficos falla
- **THEN** se muestra un mensaje de error con opción de reintentar
