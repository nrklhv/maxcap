import Link from "next/link";
import { CATEGORIES, listFiles } from "@/lib/recursos";
import { SiteHeader } from "@/components/SiteHeader";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const conConteo = await Promise.all(
    CATEGORIES.map(async (c) => ({
      ...c,
      total: (await listFiles(c.slug)).length,
    }))
  );

  return (
    <>
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-6 py-12">
        <section className="mb-12">
          <p className="text-xs uppercase tracking-widest text-orange font-semibold mb-3">
            Brand kit
          </p>
          <h1 className="text-4xl sm:text-5xl text-dark mb-4">
            Recursos de marca MaxRent
          </h1>
          <p className="text-base text-gray-3 max-w-2xl">
            Logos, piezas de campañas, fotografía y material de prensa. Descarga
            lo que necesites para campañas, medios y contenidos asociados a la
            marca.
          </p>
        </section>

        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {conConteo.map((cat) => (
              <Link
                key={cat.slug}
                href={`/categoria/${cat.slug}`}
                className="group bg-white border border-gray-1 rounded-2xl p-6 hover:border-orange transition shadow-sm"
              >
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-2xl text-dark">{cat.titulo}</h2>
                  <span className="text-xs font-medium text-gray-3 bg-cream px-2 py-1 rounded-full">
                    {cat.total} {cat.total === 1 ? "archivo" : "archivos"}
                  </span>
                </div>
                <p className="text-sm text-gray-3 mb-6">{cat.descripcion}</p>
                <span className="text-sm font-medium text-orange group-hover:underline">
                  Ver recursos →
                </span>
              </Link>
            ))}
          </div>
        </section>

        <footer className="mt-20 pt-8 border-t border-gray-1 text-xs text-gray-3">
          Acceso restringido. Para sumar archivos al sitio, hablar con el
          equipo de marketing.
        </footer>
      </main>
    </>
  );
}
