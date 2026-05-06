// =============================================================================
// /brief — Renderiza docs/MARKETING_BRIEF.md con estilos de marca
// =============================================================================

import { promises as fs } from "node:fs";
import path from "node:path";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SiteHeader } from "@/components/SiteHeader";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Brief de marketing",
};

async function loadBrief(): Promise<string> {
  const filePath = path.join(process.cwd(), "docs", "MARKETING_BRIEF.md");
  return await fs.readFile(filePath, "utf-8");
}

export default async function BriefPage() {
  const md = await loadBrief();

  return (
    <>
      <SiteHeader />
      <main className="max-w-4xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="text-xs text-gray-3 hover:text-dark mb-6 inline-block"
        >
          ← Volver
        </Link>

        <section className="mb-10">
          <p className="text-xs uppercase tracking-widest text-orange font-semibold mb-3">
            Marketing
          </p>
          <h1 className="text-4xl sm:text-5xl text-dark mb-4">
            Brief para equipo de marketing
          </h1>
          <p className="text-base text-gray-3 max-w-2xl">
            Documento vivo con propuesta de valor, audiencia, mensajes clave,
            tono, identidad visual, lineamientos editoriales, canales y KPIs.
            Para la generación de contenido orgánico y campañas pagadas.
          </p>
          <div className="flex items-center gap-3 mt-4">
            <a
              href="/api/brief/raw"
              download="MaxRent-brief-marketing.md"
              className="text-xs font-medium text-orange hover:underline"
            >
              ↓ Descargar markdown
            </a>
            <span className="text-xs text-gray-3">·</span>
            <a
              href="https://github.com/nrklhv/maxcap/blob/main/maxrent-marketing/docs/MARKETING_BRIEF.md"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-gray-3 hover:text-dark hover:underline"
            >
              Ver en GitHub
            </a>
          </div>
        </section>

        <article
          className="prose prose-lg max-w-none
            prose-headings:font-serif prose-headings:text-dark prose-headings:tracking-tight
            prose-h1:text-4xl prose-h1:mb-4
            prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-4 prose-h2:pb-3 prose-h2:border-b prose-h2:border-gray-1
            prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-3
            prose-h4:text-lg prose-h4:font-sans prose-h4:font-semibold prose-h4:tracking-wide prose-h4:uppercase prose-h4:text-orange prose-h4:mt-6 prose-h4:mb-2
            prose-p:font-sans prose-p:text-dark/80 prose-p:leading-relaxed
            prose-strong:text-dark prose-strong:font-semibold
            prose-em:text-dark
            prose-a:text-orange prose-a:no-underline hover:prose-a:underline
            prose-ul:font-sans prose-li:text-dark/80 prose-li:my-1
            prose-ol:font-sans
            prose-blockquote:border-l-orange prose-blockquote:bg-cream prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r prose-blockquote:not-italic prose-blockquote:font-sans prose-blockquote:text-dark
            prose-table:font-sans prose-table:text-sm
            prose-thead:border-b-2 prose-thead:border-dark/20
            prose-th:text-left prose-th:font-semibold prose-th:text-dark prose-th:py-2 prose-th:px-3
            prose-tbody:divide-y prose-tbody:divide-gray-1
            prose-td:py-2 prose-td:px-3 prose-td:text-dark/80 prose-td:align-top
            prose-code:font-mono prose-code:text-sm prose-code:bg-cream prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-dark
            prose-code:before:content-[''] prose-code:after:content-['']
            prose-hr:border-gray-1 prose-hr:my-12"
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>
        </article>
      </main>
    </>
  );
}
