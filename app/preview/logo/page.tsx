// =============================================================================
// /preview/logo — preview de las 3 variantes del logo "MaxRent by Houm"
// =============================================================================
// Página interna para decidir el logo. Una vez elegida la variante final,
// se reemplaza Logo.tsx, se borran los componentes LogoVariants y este
// archivo, y se descarta este path.
// =============================================================================

import type { Metadata } from "next";
import { LogoA, LogoB, LogoC } from "@/components/LogoVariants";

export const metadata: Metadata = {
  title: "Preview · Logo MaxRent by Houm",
  robots: { index: false, follow: false },
};

const sizes: Array<"sm" | "md" | "lg"> = ["sm", "md", "lg"];

const variants = [
  {
    key: "A" as const,
    name: "Variante A — Compacta vertical",
    description: '"by Houm" centrado debajo de MAXRENT. Mantiene el ancho del logo actual.',
    Component: LogoA,
  },
  {
    key: "B" as const,
    name: "Variante B — Horizontal con divisor",
    description: '"MAXRENT · by Houm" en una sola línea. Logo más ancho.',
    Component: LogoB,
  },
  {
    key: "C" as const,
    name: "Variante C — Asimétrica con sello",
    description: 'Chevrones más altos. "by Houm" alineado a la derecha del bloque.',
    Component: LogoC,
  },
];

export default function LogoPreviewPage() {
  return (
    <main className="min-h-screen bg-cream py-12 px-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-12">
          <h1 className="font-serif text-4xl text-dark">Preview Logo · MaxRent by Houm</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-3">
            Tres variantes en SVG real. Cada una se muestra sobre fondo dark
            (como aparece en el hero/header) y sobre fondo claro (footer/preview),
            en los 3 tamaños del componente actual (sm/md/lg).
          </p>
        </header>

        <div className="space-y-12">
          {variants.map(({ key, name, description, Component }) => (
            <section
              key={key}
              className="rounded-2xl border border-gray-1 bg-white p-6 shadow-sm"
            >
              <div className="mb-4">
                <h2 className="font-serif text-2xl text-dark">{name}</h2>
                <p className="text-sm text-gray-3">{description}</p>
              </div>

              {/* Fondo dark (header / hero) */}
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-3">
                Sobre fondo dark
              </div>
              <div className="rounded-xl bg-dark p-6">
                <div className="flex flex-wrap items-end gap-10">
                  {sizes.map((s) => (
                    <div key={s} className="flex flex-col items-start gap-2">
                      <Component size={s} />
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-3">
                        size = {s}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fondo claro (footer claro / preview) — usar variante con texto cremita igual */}
              <div className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wide text-gray-3">
                Sobre fondo claro (referencia)
              </div>
              <div className="rounded-xl bg-cream p-6 ring-1 ring-gray-1">
                <div className="flex flex-wrap items-end gap-10">
                  {sizes.map((s) => (
                    <div key={s} className="flex flex-col items-start gap-2">
                      <Component size={s} />
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-3">
                        size = {s}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-gray-3">
                  Sobre fondo claro el cremita pierde contraste — esto se nota igual
                  que con el logo actual; en el footer del landing actual el fondo es
                  dark también.
                </p>
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-16 text-center text-xs text-gray-3">
          Página interna · no indexable · solo para decisión de marca
        </footer>
      </div>
    </main>
  );
}
