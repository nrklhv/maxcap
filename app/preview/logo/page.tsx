// =============================================================================
// /preview/logo — preview de variantes del logo "MaxRent by Houm"
// =============================================================================
// Página interna para decisión de marca. No indexable. Una vez decidida la
// variante final, se reemplaza Logo.tsx, se borran LogoVariants y este path.
// =============================================================================

import type { Metadata } from "next";
import {
  LogoA,
  LogoB,
  LogoC,
  LogoC1,
  LogoC2,
  LogoC3,
  LogoC4,
  LogoC5,
  LogoC6,
  LogoC7,
  LogoC8,
  LogoC9,
} from "@/components/LogoVariants";

export const metadata: Metadata = {
  title: "Preview · Logo MaxRent by Houm",
  robots: { index: false, follow: false },
};

const cVariants = [
  { id: "C1", label: "Pequeño · derecha · sutil", Component: LogoC1 },
  { id: "C2", label: "Mediano · derecha", Component: LogoC2 },
  { id: "C3", label: "Grande · derecha", Component: LogoC3 },
  { id: "C4", label: "Pequeño · centrado", Component: LogoC4 },
  { id: "C5", label: "Mediano · centrado", Component: LogoC5 },
  { id: "C6", label: "Grande · centrado (más cuadrado)", Component: LogoC6 },
  { id: "C7", label: "Mediano · alineado a la izq.", Component: LogoC7 },
  { id: "C8", label: "Centrado con líneas (sello)", Component: LogoC8 },
  { id: "C9", label: "Italic · derecha (editorial)", Component: LogoC9 },
];

const referenceVariants = [
  { id: "A", label: "A — vertical compacta", Component: LogoA },
  { id: "B", label: "B — horizontal con divisor", Component: LogoB },
  { id: "C", label: "C — original", Component: LogoC },
];

const sizes: Array<"sm" | "md" | "lg"> = ["sm", "md", "lg"];

export default function LogoPreviewPage() {
  return (
    <main className="min-h-screen bg-cream py-12 px-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10">
          <h1 className="font-serif text-4xl text-dark">Logo · MaxRent by Houm</h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-3">
            9 variantes de la C: MAXRENT subido para que <span className="font-semibold">by Houm</span>{" "}
            quede mejor cuadrado. Solo cambia la presentación del &quot;by Houm&quot;
            (posición, tamaño, alineación, decoración). Abajo dejé A, B y C original como referencia.
          </p>
        </header>

        {/* Grid 3x3 de las variantes C* en fondo dark */}
        <section className="mb-12">
          <h2 className="mb-4 font-serif text-2xl text-dark">Variantes C1–C9 (sobre fondo dark)</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cVariants.map(({ id, label, Component }) => (
              <div key={id} className="rounded-2xl bg-dark p-6">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-orange-2">
                  {id}
                </div>
                <div className="mb-4 text-xs text-gray-2">{label}</div>
                <Component size="md" />
              </div>
            ))}
          </div>
        </section>

        {/* Tamaños sm/md/lg de cada variante para revisar legibilidad */}
        <section className="mb-12">
          <h2 className="mb-4 font-serif text-2xl text-dark">
            C1–C9 en los 3 tamaños (sm / md / lg)
          </h2>
          <div className="space-y-3">
            {cVariants.map(({ id, label, Component }) => (
              <div key={id} className="flex flex-col gap-2 rounded-xl bg-dark p-5 sm:flex-row sm:items-end sm:gap-10">
                <div className="min-w-[160px]">
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-orange-2">
                    {id}
                  </div>
                  <div className="mt-0.5 text-[11px] text-gray-3">{label}</div>
                </div>
                {sizes.map((s) => (
                  <div key={s} className="flex flex-col items-start gap-1.5">
                    <Component size={s} />
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-3">
                      {s}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* Referencias A, B, C original */}
        <section>
          <h2 className="mb-4 font-serif text-2xl text-dark">Referencias previas (A, B, C)</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {referenceVariants.map(({ id, label, Component }) => (
              <div key={id} className="rounded-2xl bg-dark p-6">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-gray-3">
                  {id}
                </div>
                <div className="mb-4 text-xs text-gray-2">{label}</div>
                <Component size="md" />
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-16 text-center text-xs text-gray-3">
          Página interna · no indexable · solo para decisión de marca
        </footer>
      </div>
    </main>
  );
}
