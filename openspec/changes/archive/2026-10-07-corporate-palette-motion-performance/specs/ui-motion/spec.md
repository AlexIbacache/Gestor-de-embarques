# Spec Delta

## Purpose
Defines the Motion-based animation system: shared tokens, the surfaces where animation applies, and support for reduced-motion preferences.

## ADDED Requirements

### Requirement: Shared motion tokens
Animations SHALL derive from a single set of tokens (duration, easing, offset, and stagger) instead of per-component loose values.

#### Scenario: Consistent animation
- **WHEN** content entry is animated on any surface
- **THEN** it uses the duration, easing, and offset tokens defined by the motion system

### Requirement: Entry-animated surfaces
Content SHALL animate subtly and briefly on appearance on the surfaces that need it: page content, stat cards, table rows, and dialogs/drawer.

#### Scenario: Content entry
- **WHEN** a card, a table row, or page content appears
- **THEN** it applies a short, smooth opacity and/or position transition

#### Scenario: Dialogs and drawer
- **WHEN** a dialog or the mobile navigation drawer opens
- **THEN** it appears with a smooth transition, without blocking user interaction

### Requirement: Reduced-motion support
Animations SHALL be disabled when the user prefers reduced motion, and their execution SHALL NOT produce layout shift.

#### Scenario: Reduced-motion preference
- **WHEN** the user has `prefers-reduced-motion: reduce`
- **THEN** animations do not play and content appears directly in its final state

#### Scenario: No layout shift
- **WHEN** content or rows are animated on entry
- **THEN** the animation causes no cumulative layout shift (CLS) and does not degrade scrolling
