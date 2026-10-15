import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

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
      className={cn("font-sans", inter.variable)}
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}