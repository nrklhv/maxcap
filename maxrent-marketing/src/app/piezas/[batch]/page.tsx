import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { findBatch, BATCHES } from "@/lib/piezas/registry";
import { DIMENSIONES } from "@/lib/piezas/types";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return BATCHES.map((b) => ({ batch: b.fecha }));
}

export default function BatchPage({
  params,
}: {
  params: { batch: string };
}) {
  const batch = findBatch(params.batch);
  if (!batch) notFound();

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
          <p className="text-xs font-mono text-gray-3 mb-2">
            Batch · {batch.fecha}
          </p>
          <h1 className="text-4xl sm:text-5xl text-dark mb-4">{batch.nombre}</h1>
          <p className="text-base text-gray-3 max-w-2xl">{batch.descripcion}</p>
        </section>

        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {batch.piezas.map((pieza) => {
              const dim = DIMENSIONES[pieza.formato];
              const previewSrc = `/api/piezas/${batch.fecha}/${pieza.id}.png`;
              const downloadSrc = `${previewSrc}?download=1`;
              return (
                <article
                  key={pieza.id}
                  className="bg-white border border-gray-1 rounded-2xl overflow-hidden flex flex-col"
                >
                  <div className="bg-dark relative" style={{ aspectRatio: `${dim.ancho} / ${dim.alto}` }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewSrc}
                      alt={pieza.titulo}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-4 flex items-center justify-between border-t border-gray-1">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-dark truncate">
                        {pieza.titulo}
                      </p>
                      <p className="text-xs text-gray-3 mt-0.5">
                        {pieza.formato} · {dim.ancho}×{dim.alto} · PNG
                      </p>
                    </div>
                    <a
                      href={downloadSrc}
                      download={`${batch.fecha}-${pieza.id}.png`}
                      className="ml-4 text-sm font-medium text-orange hover:underline shrink-0"
                    >
                      Descargar
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}
