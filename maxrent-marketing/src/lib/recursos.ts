// =============================================================================
// Recursos de marca — manifest de categorías y helper de listado en disco
// =============================================================================
//
// Los archivos viven en `private/recursos/<slug>/...` (fuera de /public para
// que solo se sirvan via API gated). Para agregar una categoría nueva:
//   1) Sumar entrada al array CATEGORIES de abajo.
//   2) Crear `private/recursos/<slug>/` y subir los archivos.
//   3) Commit + push → Vercel redeploya automáticamente.
// =============================================================================

import { promises as fs } from "node:fs";
import path from "node:path";

export type CategoriaSlug =
  | "logos"
  | "piezas-pagadas"
  | "fotos"
  | "prensa";

export type Categoria = {
  slug: CategoriaSlug;
  titulo: string;
  descripcion: string;
};

export const CATEGORIES: Categoria[] = [
  {
    slug: "logos",
    titulo: "Logos",
    descripcion: "Isotipo, logotipo y variaciones en distintos formatos.",
  },
  {
    slug: "piezas-pagadas",
    titulo: "Piezas pagadas",
    descripcion: "Creatividades para campañas en Meta Ads y Google Ads.",
  },
  {
    slug: "fotos",
    titulo: "Fotografía",
    descripcion: "Banco de fotos de marca y producto.",
  },
  {
    slug: "prensa",
    titulo: "Prensa",
    descripcion: "Notas de prensa, boilerplate y dossier para medios.",
  },
];

export type RecursoFile = {
  nombre: string;
  /** Tamaño en bytes */
  size: number;
  /** Path relativo al endpoint de descarga: /api/recursos/<slug>/<nombre> */
  href: string;
};

const ROOT = path.join(process.cwd(), "private", "recursos");

/** Devuelve la lista de archivos dentro de una categoría (recursivo, plano). */
export async function listFiles(slug: CategoriaSlug): Promise<RecursoFile[]> {
  const dir = path.join(ROOT, slug);
  let entries: string[] = [];
  try {
    entries = await collectFiles(dir, dir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }

  const files: RecursoFile[] = [];
  for (const rel of entries) {
    const abs = path.join(dir, rel);
    const stat = await fs.stat(abs);
    files.push({
      nombre: rel,
      size: stat.size,
      href: `/api/recursos/${slug}/${rel.split(path.sep).join("/")}`,
    });
  }
  return files.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

async function collectFiles(base: string, dir: string): Promise<string[]> {
  const out: string[] = [];
  const items = await fs.readdir(dir, { withFileTypes: true });
  for (const item of items) {
    if (item.name.startsWith(".")) continue;
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      const sub = await collectFiles(base, full);
      out.push(...sub);
    } else if (item.isFile()) {
      out.push(path.relative(base, full));
    }
  }
  return out;
}

/** Resuelve un path solicitado a un absoluto seguro dentro de ROOT. */
export function resolveResourcePath(slug: string, parts: string[]): string | null {
  const joined = path.join(ROOT, slug, ...parts);
  const resolved = path.resolve(joined);
  const safeRoot = path.resolve(ROOT);
  if (!resolved.startsWith(safeRoot + path.sep) && resolved !== safeRoot) {
    return null;
  }
  return resolved;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
