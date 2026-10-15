# Spec Delta

## Purpose

Muestra un panel de control con estadísticas resumidas del sistema y los últimos embarques registrados.

## ADDED Requirements

### Requirement: Estadísticas resumidas
El sistema DEBE mostrar cards con al menos las siguientes estadísticas: total de embarques, embarques en tránsito y embarques retrasados. Los valores DEBEN calcularse desde la base de datos.

#### Scenario: Dashboard con datos
- **WHEN** el usuario navega a `/dashboard` y existen embarques
- **THEN** el sistema muestra cards con los conteos de embarques por estado

#### Scenario: Dashboard sin datos
- **WHEN** el usuario navega a `/dashboard` y no existen embarques
- **THEN** las cards muestran valores en cero

### Requirement: Últimos embarques
El sistema DEBE mostrar un listado de los últimos embarques creados, incluyendo referencia, cliente, estado y fecha.

#### Scenario: Últimos embarques con datos
- **WHEN** el usuario navega a `/dashboard` y existen embarques
- **THEN** el sistema muestra los embarques más recientes con su información básica

### Requirement: Renderizado server-side del dashboard
Los datos del dashboard DEBEN obtenerse en un Server Component para garantizar SSR.

#### Scenario: Datos obtenidos en servidor
- **WHEN** se carga la página `/dashboard`
- **THEN** los conteos y el listado de últimos embarques se obtienen desde el servidor antes del renderizado
