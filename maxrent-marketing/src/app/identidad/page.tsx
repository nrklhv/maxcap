import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { ColorSwatch } from "@/components/ColorSwatch";
import {
  LOGOS_CON_BY_HOUM,
  LOGOS_SIN_BY_HOUM,
  COLORES,
  readSvgInline,
  downloadHref,
  type LogoVariante,
} from "@/lib/identidad";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Identidad de marca",
};

async function loadVariants(list: LogoVariante[]) {
  const svgs = await Promise.all(list.map((l) => readSvgInline(l.archivo)));
  return list.map((l, i) => ({ ...l, svg: svgs[i] }));
}

export default async function IdentidadPage() {
  const [conByHoum, sinByHoum] = await Promise.all([
    loadVariants(LOGOS_CON_BY_HOUM),
    loadVariants(LOGOS_SIN_BY_HOUM),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="text-xs text-gray-3 hover:text-dark mb-6 inline-block"
        >
          ← Volver
        </Link>

        <section className="mb-16">
          <p className="text-xs uppercase tracking-widest text-orange font-semibold mb-3">
            Brand kit
          </p>
          <h1 className="text-4xl sm:text-5xl text-dark mb-4">
            Identidad de marca
          </h1>
          <p className="text-base text-gray-3 max-w-2xl">
            Sistema visual de MaxRent: logos, paleta de colores y tipografías.
            Descarga lo que necesites para mantener consistencia en piezas,
            campañas y comunicaciones.
          </p>
        </section>

        <LogoSection
          eyebrow="Logo principal"
          titulo="MaxRent by Houm"
          descripcion="Versión con endoso. Default cuando se introduce la marca o cuando el contexto requiere atribución a Houm."
          variantes={conByHoum}
        />

        <LogoSection
          eyebrow="Logo solo"
          titulo="MaxRent (sin endoso)"
          descripcion="Para piezas donde MaxRent ya está establecido y no requiere mencionar a Houm. Usar con criterio editorial."
          variantes={sinByHoum}
        />

        <section className="mb-16">
          <p className="text-xs uppercase tracking-widest text-orange font-semibold mb-3">
            Paleta
          </p>
          <h2 className="text-3xl text-dark mb-3">Colores</h2>
          <p className="text-sm text-gray-3 max-w-2xl mb-8">
            Click en cada swatch para copiar el hex al portapapeles.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {COLORES.map((c) => (
              <ColorSwatch
                key={c.hex}
                name={c.nombre}
                hex={c.hex}
                note={c.nota}
                textColor={c.textColor}
              />
            ))}
          </div>
        </section>

        <section className="mb-16">
          <p className="text-xs uppercase tracking-widest text-orange font-semibold mb-3">
            Tipografía
          </p>
          <h2 className="text-3xl text-dark mb-3">Tipografías</h2>
          <p className="text-sm text-gray-3 max-w-2xl mb-8">
            DM Serif Display + DM Sans. Ambas en{" "}
            <a
              href="https://fonts.google.com/specimen/DM+Serif+Display"
              target="_blank"
              rel="noreferrer"
              className="text-orange hover:underline"
            >
              Google Fonts
            </a>
            , gratis.
          </p>

          <div className="space-y-6">
            <div className="bg-white border border-gray-1 rounded-2xl p-8">
              <p className="text-xs uppercase tracking-widest text-gray-3 font-semibold mb-2">
                DM Serif Display · Headings
              </p>
              <p className="font-serif text-5xl sm:text-6xl text-dark leading-tight">
                Inversión inmobiliaria simple.
              </p>
              <p className="font-serif italic text-3xl text-gray-3 mt-3">
                by Houm · endoso editorial
              </p>
              <p className="text-xs text-gray-3 mt-6">
                Solo para H1, H2, H3 y endosos. Weight 400, soporta itálicas.
              </p>
            </div>

            <div className="bg-white border border-gray-1 rounded-2xl p-8">
              <p className="text-xs uppercase tracking-widest text-gray-3 font-semibold mb-4">
                DM Sans · Cuerpo de texto
              </p>
              <p className="font-sans font-light text-2xl text-dark mb-2">
                Light (300) · MAXRENT en wordmark
              </p>
              <p className="font-sans font-normal text-2xl text-dark mb-2">
                Regular (400) · cuerpo principal
              </p>
              <p className="font-sans font-medium text-2xl text-dark mb-2">
                Medium (500) · CTAs y énfasis
              </p>
              <p className="font-sans font-semibold text-2xl text-dark">
                Semibold (600) · UI labels
              </p>
              <p className="text-xs text-gray-3 mt-6">
                Para todo el cuerpo de texto, UI, botones y wordmark del logo.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-16">
          <p className="text-xs uppercase tracking-widest text-orange font-semibold mb-3">
            Reglas
          </p>
          <h2 className="text-3xl text-dark mb-3">Uso correcto</h2>
          <p className="text-sm text-gray-3 max-w-2xl mb-8">
            Estas reglas aplican al logo. La consistencia construye marca.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-1 rounded-2xl p-6">
              <h3 className="text-xl text-dark mb-4 flex items-center gap-2">
                <span className="text-orange text-lg">✓</span> Sí
              </h3>
              <ul className="space-y-2 text-sm text-gray-3">
                <li>Mantener proporciones originales (no estirar).</li>
                <li>Respetar espacio libre alrededor (~24px digital).</li>
                <li>Usar la variante de color contraria al fondo: light sobre oscuro, dark sobre claro.</li>
                <li>Preferir SVG por sobre PNG/JPG cuando sea posible.</li>
                <li>Tamaño mínimo del wordmark: 100px de ancho. Por debajo, usar el ícono solo.</li>
              </ul>
            </div>

            <div className="bg-white border border-gray-1 rounded-2xl p-6">
              <h3 className="text-xl text-dark mb-4 flex items-center gap-2">
                <span className="text-orange text-lg">✗</span> No
              </h3>
              <ul className="space-y-2 text-sm text-gray-3">
                <li>Cambiar los colores del logo.</li>
                <li>Agregar sombras, bordes o gradientes.</li>
                <li>Rotar, inclinar, recortar o cubrir.</li>
                <li>Reescribir &ldquo;MAXRENT&rdquo; o &ldquo;by Houm&rdquo; en otra fuente.</li>
                <li>Usar el ícono solo cuando hay espacio para el wordmark completo.</li>
              </ul>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function LogoSection({
  eyebrow,
  titulo,
  descripcion,
  variantes,
}: {
  eyebrow: string;
  titulo: string;
  descripcion: string;
  variantes: (LogoVariante & { svg: string })[];
}) {
  return (
    <section className="mb-16">
      <p className="text-xs uppercase tracking-widest text-orange font-semibold mb-3">
        {eyebrow}
      </p>
      <h2 className="text-3xl text-dark mb-3">{titulo}</h2>
      <p className="text-sm text-gray-3 max-w-2xl mb-8">{descripcion}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {variantes.map((v) => (
          <article
            key={v.archivo}
            className="bg-white border border-gray-1 rounded-2xl overflow-hidden"
          >
            <div
              className={`flex items-center justify-center p-10 ${
                v.fondo === "dark" ? "bg-dark" : "bg-cream"
              }`}
            >
              <div
                className="w-full max-w-[220px]"
                dangerouslySetInnerHTML={{ __html: v.svg }}
              />
            </div>
            <div className="p-4 flex items-center justify-between border-t border-gray-1">
              <div className="min-w-0">
                <p className="text-sm font-medium text-dark">{v.nombre}</p>
                {v.uso && (
                  <p className="text-xs text-gray-3 mt-0.5 truncate">
                    {v.uso}
                  </p>
                )}
              </div>
              <a
                href={downloadHref(v.archivo)}
                download
                className="ml-4 text-sm font-medium text-orange hover:underline shrink-0"
              >
                Descargar
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
