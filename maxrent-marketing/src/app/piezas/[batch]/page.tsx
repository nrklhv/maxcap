import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { findBatch, BATCHES } from "@/lib/piezas/registry";
import { DIMENSIONES, type Pieza } from "@/lib/piezas/types";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return BATCHES.map((b) => ({ batch: b.fecha }));
}

type Group =
  | { kind: "single"; pieza: Pieza }
  | { kind: "carrusel"; carruselId: string; nombre: string; slides: Pieza[] };

function agrupar(piezas: Pieza[]): Group[] {
  const groups: Group[] = [];
  const carruselMap = new Map<string, Pieza[]>();

  for (const p of piezas) {
    if (p.carrusel) {
      const arr = carruselMap.get(p.carrusel.id);
      if (arr) arr.push(p);
      else carruselMap.set(p.carrusel.id, [p]);
    } else {
      groups.push({ kind: "single", pieza: p });
    }
  }

  // Insertar cada carrusel en el orden en que aparece su primer slide
  const insertedCarruseles = new Set<string>();
  const final: Group[] = [];
  for (const p of piezas) {
    if (p.carrusel) {
      if (!insertedCarruseles.has(p.carrusel.id)) {
        insertedCarruseles.add(p.carrusel.id);
        const slides = (carruselMap.get(p.carrusel.id) || []).sort(
          (a, b) => (a.carrusel?.slideIdx ?? 0) - (b.carrusel?.slideIdx ?? 0)
        );
        final.push({
          kind: "carrusel",
          carruselId: p.carrusel.id,
          nombre: p.carrusel.nombre,
          slides,
        });
      }
    } else {
      final.push({ kind: "single", pieza: p });
    }
  }
  return final;
}

function PiezaCard({ pieza, batchFecha }: { pieza: Pieza; batchFecha: string }) {
  const dim = DIMENSIONES[pieza.formato];
  const previewSrc = `/api/piezas/${batchFecha}/${pieza.id}.png`;
  const downloadSrc = `${previewSrc}?download=1`;
  const slideLabel = pieza.carrusel
    ? `${pieza.carrusel.slideIdx} / ${pieza.carrusel.total}`
    : null;
  return (
    <article className="bg-white border border-gray-1 rounded-2xl overflow-hidden flex flex-col">
      <div
        className="bg-dark relative"
        style={{ aspectRatio: `${dim.ancho} / ${dim.alto}` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewSrc}
          alt={pieza.titulo}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        {slideLabel && (
          <span className="absolute top-3 right-3 text-[10px] uppercase tracking-widest bg-dark/80 text-cream px-2 py-1 rounded-full font-mono">
            {slideLabel}
          </span>
        )}
      </div>
      <div className="p-4 flex items-center justify-between border-t border-gray-1">
        <div className="min-w-0">
          <p className="text-sm font-medium text-dark truncate">{pieza.titulo}</p>
          <p className="text-xs text-gray-3 mt-0.5">
            {pieza.formato} · {dim.ancho}×{dim.alto} · PNG
          </p>
        </div>
        <a
          href={downloadSrc}
          download={`${batchFecha}-${pieza.id}.png`}
          className="ml-4 text-sm font-medium text-orange hover:underline shrink-0"
        >
          Descargar
        </a>
      </div>
    </article>
  );
}

export default function BatchPage({ params }: { params: { batch: string } }) {
  const batch = findBatch(params.batch);
  if (!batch) notFound();

  const grupos = agrupar(batch.piezas);
  const singles = grupos.filter((g) => g.kind === "single");
  const carruseles = grupos.filter((g) => g.kind === "carrusel");

  return (
    <>
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-6 py-12">
        <Link
          href="/piezas"
          className="text-xs text-gray-3 hover:text-dark mb-6 inline-block"
        >
          ← Volver a batches
        </Link>

        <section className="mb-10">
          <p className="text-xs font-mono text-gray-3 mb-2">Batch · {batch.fecha}</p>
          <h1 className="text-4xl sm:text-5xl text-dark mb-4">{batch.nombre}</h1>
          <p className="text-base text-gray-3 max-w-2xl">{batch.descripcion}</p>
          <div className="flex items-center gap-4 mt-4 text-xs text-gray-3">
            <span className="font-medium">
              {singles.length} {singles.length === 1 ? "single" : "singles"}
            </span>
            <span>·</span>
            <span className="font-medium">
              {carruseles.length} {carruseles.length === 1 ? "carrusel" : "carruseles"}
            </span>
            <span>·</span>
            <span>{batch.piezas.length} piezas en total</span>
          </div>
        </section>

        {/* SINGLES */}
        {singles.length > 0 && (
          <section className="mb-14">
            <div className="flex items-baseline justify-between mb-6">
              <h2 className="text-2xl text-dark font-serif">Singles</h2>
              <span className="text-xs uppercase tracking-widest text-gray-3 font-medium">
                Una imagen · una publicación
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {singles.map((g) => g.kind === "single" && (
                <PiezaCard key={g.pieza.id} pieza={g.pieza} batchFecha={batch.fecha} />
              ))}
            </div>
          </section>
        )}

        {/* CARRUSELES */}
        {carruseles.length > 0 && (
          <section>
            <div className="flex items-baseline justify-between mb-6">
              <h2 className="text-2xl text-dark font-serif">Carruseles</h2>
              <span className="text-xs uppercase tracking-widest text-gray-3 font-medium">
                Multiimagen · subir todas las slides
              </span>
            </div>
            <div className="space-y-12">
              {carruseles.map((g) => g.kind === "carrusel" && (
                <div key={g.carruselId} className="bg-cream border border-gray-1 rounded-2xl p-6">
                  <div className="flex items-baseline justify-between mb-4">
                    <h3 className="text-lg font-serif text-dark">{g.nombre}</h3>
                    <span className="text-xs uppercase tracking-widest text-gray-3 font-mono">
                      {g.slides.length} slides
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {g.slides.map((slide) => (
                      <PiezaCard key={slide.id} pieza={slide} batchFecha={batch.fecha} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
