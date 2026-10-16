import type { Metadata } from "next";
import "./globals.css";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";

// One sans family in three weights for the whole UI, plus a mono face for
// references and dates (EMB-2417, 02 nov 2026) so codes line up in columns.
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
});
// Mono is only used in a few spots (error codes, shipment references in the
// attention panel), so it is one weight and NOT preloaded: preloading three
// faces that most pages never paint is what made the browser warn about unused
// preloads. It still loads on demand the first time a `font-mono` element shows.
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-plex-mono",
  preload: false,
});

export const metadata: Metadata = {
  title: "Gestor de Embarques",
  description:
    "Gestión de clientes y embarques logísticos: alta, edición y seguimiento en un solo lugar.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // `suppressHydrationWarning` is required by next-themes: it adds the theme
    // class to `<html>` before hydration, so the server and first client render
    // intentionally differ on that one attribute.
    <html
      lang="es"
      suppressHydrationWarning
      className={cn("font-sans", plexSans.variable, plexMono.variable)}
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}