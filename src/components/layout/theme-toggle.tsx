"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

const emptySubscribe = () => () => {};

/**
 * `false` during SSR and the first client render, `true` once the component is
 * hydrated. `useSyncExternalStore` is used instead of a `useState` + `useEffect`
 * mounted flag because calling `setState` synchronously inside an effect is
 * disallowed by the React lint rules.
 */
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

/**
 * Light/dark switch backed by `next-themes`.
 *
 * The mounted guard is required, not cosmetic: the server has no access to the
 * resolved theme, so rendering the icon/label before hydration would either
 * mismatch the client or force a wrong icon on first paint. Until mounted we
 * render a stable, same-sized placeholder so nothing shifts.
 *
 * The icon shows the theme currently in effect; the `aria-label` describes the
 * action the click performs.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label="Cambiar tema"
        disabled
      >
        <Sun className="size-5" aria-hidden="true" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon-lg"
      aria-label={isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? (
        <Moon className="size-5" aria-hidden="true" />
      ) : (
        <Sun className="size-5" aria-hidden="true" />
      )}
    </Button>
  );
}
