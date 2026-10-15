"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Thin wrapper that pins the app-wide theming contract in one place:
 *
 * - `attribute="class"` toggles the `.dark` class on `<html>`, which is the
 *   selector the dark tokens in `globals.css` key off.
 * - `defaultTheme="system"` + `enableSystem` make the OS preference the
 *   default for a first visit without a stored choice.
 * - `disableTransitionOnChange` avoids every surface animating its colors at
 *   once when the theme flips.
 *
 * Persistence and the pre-hydration script (anti-flash) are handled by
 * `next-themes` itself; no app-level storage is needed.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
