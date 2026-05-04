import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { BATCHES } from "@/lib/piezas/registry";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Piezas para feed",
};

export default function PiezasPage() {
  // Más reciente primero
  const ordenados = [...BATCHES].sort((a, b) => b.fecha.localeCompare(a.fecha));

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

        <section className="mb-10">
          <p className="text-xs uppercase tracking-widest text-orange font-semibold mb-3">
            Social media
          </p>
          <h1 className="text-4xl sm:text-5xl text-dark mb-4">
            Piezas para feed
          </h1>
          <p className="text-base text-gray-3 max-w-2xl">
            Batches de piezas para Instagram y Facebook organizados por fecha.
            Cada pieza está lista para descargar como PNG y subir directo a la
            plataforma.
          </p>
        </section>

        <section>
          {ordenados.length === 0 ? (
            <div className="bg-white border border-gray-1 rounded-2xl p-10 text-center">
              <p className="text-sm text-gray-3">
                Aún no hay batches publicados.
              </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {ordenados.map((b) => (
                <li key={b.fecha}>
                  <Link
                    href={`/piezas/${b.fecha}`}
                    className="group block bg-white border border-gray-1 rounded-2xl p-6 hover:border-orange transition shadow-sm"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono text-gray-3 mb-2">
                          {formatearFecha(b.fecha)}
                        </p>
                        <h2 className="text-2xl text-dark mb-1">{b.nombre}</h2>
                        <p className="text-sm text-gray-3 line-clamp-2">
                          {b.descripcion}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <span className="text-xs font-medium text-gray-3 bg-cream px-3 py-1.5 rounded-full">
                          {b.piezas.length}{" "}
                          {b.piezas.length === 1 ? "pieza" : "piezas"}
                        </span>
                        <span className="text-sm font-medium text-orange group-hover:underline">
                          Ver →
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}

function formatearFecha(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}
