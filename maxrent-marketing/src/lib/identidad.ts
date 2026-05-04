// =============================================================================
// Datos de la página /identidad — colores, tipografías, lectura de SVG inline
// =============================================================================

import { promises as fs } from "node:fs";
import path from "node:path";

export type LogoVariante = {
  /** Path relativo desde private/recursos/ */
  archivo: string;
  /** Nombre visible */
  nombre: string;
  /** "dark" → renderizar sobre fondo oscuro · "light" → sobre fondo claro */
  fondo: "dark" | "light";
  /** Texto explicativo opcional */
  uso?: string;
};

export const LOGOS_CON_BY_HOUM: LogoVariante[] = [
  {
    archivo: "logos/con-by-houm/maxrent-by-houm-light.svg",
    nombre: "Light · color",
    fondo: "dark",
    uso: "Default sobre fondo oscuro",
  },
  {
    archivo: "logos/con-by-houm/maxrent-by-houm-dark.svg",
    nombre: "Dark · color",
    fondo: "light",
    uso: "Default sobre fondo claro",
  },
  {
    archivo: "logos/con-by-houm/maxrent-by-houm-mono-light.svg",
    nombre: "Mono claro",
    fondo: "dark",
    uso: "Una sola tinta blanca",
  },
  {
    archivo: "logos/con-by-houm/maxrent-by-houm-mono-dark.svg",
    nombre: "Mono navy",
    fondo: "light",
    uso: "Una sola tinta navy · B/N",
  },
  {
    archivo: "logos/con-by-houm/maxrent-icon-color.svg",
    nombre: "Ícono",
    fondo: "light",
    uso: "Favicon, avatar, watermark",
  },
];

export const LOGOS_SIN_BY_HOUM: LogoVariante[] = [
  {
    archivo: "logos/sin-by-houm/maxrent-light.svg",
    nombre: "Light · color",
    fondo: "dark",
    uso: "Default sobre fondo oscuro",
  },
  {
    archivo: "logos/sin-by-houm/maxrent-dark.svg",
    nombre: "Dark · color",
    fondo: "light",
    uso: "Default sobre fondo claro",
  },
  {
    archivo: "logos/sin-by-houm/maxrent-mono-light.svg",
    nombre: "Mono claro",
    fondo: "dark",
    uso: "Una sola tinta blanca",
  },
  {
    archivo: "logos/sin-by-houm/maxrent-mono-dark.svg",
    nombre: "Mono navy",
    fondo: "light",
    uso: "Una sola tinta navy · B/N",
  },
];

export type ColorToken = {
  nombre: string;
  hex: string;
  nota?: string;
  textColor?: "light" | "dark";
};

export const COLORES: ColorToken[] = [
  {
    nombre: "Naranja brillante",
    hex: "#FF6701",
    nota: "Chevrón izquierdo · acentos",
    textColor: "light",
  },
  {
    nombre: "Naranja quemado",
    hex: "#CC4A28",
    nota: "Chevrón derecho",
    textColor: "light",
  },
  {
    nombre: "Dark navy",
    hex: "#001F30",
    nota: "Wordmark sobre claro · base",
    textColor: "light",
  },
  {
    nombre: "Wordmark crema",
    hex: "#EDE0CC",
    nota: "Wordmark sobre oscuro",
    textColor: "dark",
  },
  {
    nombre: "Cream",
    hex: "#FBF7F3",
    nota: "Fondo neutro general",
    textColor: "dark",
  },
  {
    nombre: "Blanco",
    hex: "#FFFFFF",
    nota: "Mono claro",
    textColor: "dark",
  },
];

/** Lee un SVG desde private/recursos/ y retorna el contenido sin XML declaration. */
export async function readSvgInline(archivoRelativo: string): Promise<string> {
  const full = path.join(process.cwd(), "private", "recursos", archivoRelativo);
  const content = await fs.readFile(full, "utf-8");
  return content.replace(/<\?xml[^?]*\?>\s*/i, "").trim();
}

/** Convierte un path relativo en URL del endpoint de descarga. */
export function downloadHref(archivoRelativo: string): string {
  return `/api/recursos/${archivoRelativo}`;
}
