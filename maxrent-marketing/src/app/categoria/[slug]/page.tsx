import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORIES, listFiles, formatSize, type CategoriaSlug } from "@/lib/recursos";
import { SiteHeader } from "@/components/SiteHeader";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export default async function CategoriaPage({
  params,
}: {
  params: { slug: string };
}) {
  const cat = CATEGORIES.find((c) => c.slug === params.slug);
  if (!cat) notFound();

  const files = await listFiles(cat.slug as CategoriaSlug);

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
            Categoría
          </p>
          <h1 className="text-4xl sm:text-5xl text-dark mb-3">{cat.titulo}</h1>
          <p className="text-base text-gray-3 max-w-2xl">{cat.descripcion}</p>
        </section>

        {files.length === 0 ? (
          <div className="bg-white border border-gray-1 rounded-2xl p-10 text-center">
            <p className="text-sm text-gray-3">
              Aún no hay archivos en esta categoría.
            </p>
          </div>
        ) : (
          <ul className="bg-white border border-gray-1 rounded-2xl divide-y divide-gray-1 overflow-hidden">
            {files.map((f) => (
              <li
                key={f.href}
                className="flex items-center justify-between px-5 py-4 hover:bg-cream/40 transition"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-dark font-medium truncate">
                    {f.nombre}
                  </p>
                  <p className="text-xs text-gray-3 mt-0.5">
                    {formatSize(f.size)}
                  </p>
                </div>
                <a
                  href={f.href}
                  className="ml-4 text-sm font-medium text-orange hover:underline shrink-0"
                  download
                >
                  Descargar
                </a>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
