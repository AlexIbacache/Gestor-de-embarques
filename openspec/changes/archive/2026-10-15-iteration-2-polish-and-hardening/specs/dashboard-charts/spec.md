# Spec Delta

## ADDED Requirements

### Requirement: Legibilidad de gráficos en viewports reducidos
Las etiquetas, valores de ejes y leyendas de los gráficos DEBEN permanecer legibles y completas en todos los anchos soportados: NINGÚN texto DEBE quedar truncado, cortado o superpuesto. En viewports reducidos, los gráficos DEBEN adaptar la densidad de ticks, la orientación o la estrategia de etiquetas en lugar de recortar el texto.

#### Scenario: Etiquetas completas en mobile
- **WHEN** el usuario navega a `/dashboard` en un viewport de 360px de ancho
- **THEN** las etiquetas de ejes, valores y leyendas de los tres gráficos se muestran completas, sin truncamiento ni superposición

#### Scenario: Etiquetas de mes legibles
- **WHEN** el timeline muestra muchos meses en un viewport reducido
- **THEN** el gráfico reduce la densidad de etiquetas o adapta su formato en lugar de cortar o solapar los nombres de los meses
