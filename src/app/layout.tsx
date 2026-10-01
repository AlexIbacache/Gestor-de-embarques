import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Gestor de Embarques",
  description:
    "Gestión de clientes y embarques logísticos: alta, edición y seguimiento en un solo lugar.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={cn("font-sans", inter.variable)}>
      <body>{children}</body>
    </html>
  );
}