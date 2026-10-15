# Spec Delta

## Purpose

Defines the elevated card system with soft shadows, increased border radius (rounded-2xl/20px), no visible borders, and subtle hover micro-interactions for all dashboard cards and modular surfaces.

## ADDED Requirements

### Requirement: Cards have no visible borders
All dashboard cards and modular containers SHALL NOT render visible borders (`border`, `border-border` classes removed). Separation is achieved through background contrast and shadows only.

#### Scenario: Card renders without border
- **WHEN** any dashboard card renders
- **THEN** it has no `border` class and no visible 1px border

### Requirement: Cards use elevated border radius
All dashboard cards SHALL use `rounded-2xl` (16px) or `rounded-[20px]` border radius for a softer, modern appearance.

#### Scenario: Card radius renders
- **WHEN** any dashboard card renders
- **THEN** its border radius is at least 16px (`rounded-2xl`)

### Requirement: Cards use soft drop shadows
All dashboard cards SHALL use a soft, diffuse shadow (`shadow-sm` or `shadow-[0_8px_30px_rgb(0,0,0,0.04)]`) to create elevation against the app shell background.

#### Scenario: Card shadow renders
- **WHEN** any dashboard card renders
- **THEN** it has a visible but subtle drop shadow creating depth

### Requirement: Cards have subtle hover elevation
Interactive dashboard cards SHALL respond to hover with a subtle elevation or scale effect (`whileHover={{ scale: 1.01 }}` or equivalent shadow increase) using Framer Motion.

#### Scenario: Card hover elevation
- **WHEN** user hovers over an interactive dashboard card
- **THEN** the card subtly elevates or scales (max 1.01x) with a smooth transition

### Requirement: Internal elements use rounded-xl or rounded-full
Buttons, inputs, badges, and other interactive elements within cards SHALL use `rounded-xl` or `rounded-full` for consistency with the elevated card aesthetic.

#### Scenario: Button radius in card
- **WHEN** a button renders inside a dashboard card
- **THEN** it uses `rounded-full` or `rounded-xl`

#### Scenario: Input radius in card
- **WHEN** an input renders inside a dashboard card
- **THEN** it uses `rounded-full` or `rounded-xl`

#### Scenario: Badge radius in card
- **WHEN** a badge/status pill renders inside a dashboard card
- **THEN** it uses `rounded-full`