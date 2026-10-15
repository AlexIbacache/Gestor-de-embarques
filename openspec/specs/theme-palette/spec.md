# theme-palette Specification

## Purpose
Defines the application's corporate color palette for light and dark themes, as the single source of the color tokens consumed by layout, dashboard, list pages, and charts.

## Requirements

### Requirement: Corporate brand palette
The application SHALL use a corporate palette with a blue primary, a sky accent, and white/gray neutrals as its brand colors, replacing the previous lime accent.

#### Scenario: Corporate primary color
- **WHEN** any primary action element renders (primary button, active link, focus ring)
- **THEN** it uses the blue primary token of the corporate palette

#### Scenario: Sky accent
- **WHEN** an accent surface or element renders (active sidebar item, soft highlight)
- **THEN** it uses the sky accent token of the corporate palette

#### Scenario: White and gray neutrals
- **WHEN** neutral surfaces, backgrounds, borders, or secondary text render
- **THEN** they use white for elevated surfaces and grays for background, borders, and secondary text

### Requirement: Coherent palette in light and dark theme
The palette SHALL define the same color roles in light and dark themes so switching themes does not change the visual identity or the meaning of colors.

#### Scenario: Theme switch
- **WHEN** the user toggles between light and dark theme
- **THEN** every role (background, surface, text, border, primary, accent, states, sidebar, charts) resolves to the corresponding corporate palette variant

### Requirement: Accessible contrast
Text and icons over brand and state colors SHALL meet a minimum legible contrast (WCAG AA) in both themes.

#### Scenario: Text over brand color
- **WHEN** text or an icon renders over the primary, accent, or a state color
- **THEN** the foreground/background contrast meets the AA minimum in light and dark themes

### Requirement: Preserved semantic states
State colors SHALL keep their meaning (success, warning, danger) and be harmonized with the new palette, instead of reusing the brand blue for everything.

#### Scenario: State meaning
- **WHEN** a semantic state renders (for example, an error message or a success badge)
- **THEN** it uses the state color matching its meaning, not the brand primary
