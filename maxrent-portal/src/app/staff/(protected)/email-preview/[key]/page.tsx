/**
 * Staff — preview de un template específico.
 *
 * Server Component: renderea el template con variables de ejemplo (mock) o con
 * overrides pasados por query string. Muestra:
 *   - Subject + meta del template (trigger, descripción).
 *   - Preview HTML en iframe (lo más parecido al render real en clientes).
 *   - Versión plain-text al lado (lo que ven clientes sin HTML).
 *
 * Override de variables via query params: `?firstName=Maria&unitDescription=X`.
 *
 * @source GET /staff/email-preview/[key]
 * @domain staff
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  renderTemplate,
  type TemplateKey,
  type TemplateMap,
} from "@/lib/services/notifications/templates/_registry";
import { TEMPLATE_METADATA, TEMPLATE_SAMPLE_VARS } from "../_metadata";

type Props = {
  params: { key: string };
  searchParams: Record<string, string | string[] | undefined>;
};

const VALID_KEYS = Object.keys(TEMPLATE_METADATA) as TemplateKey[];

function isValidTemplateKey(key: string): key is TemplateKey {
  return (VALID_KEYS as string[]).includes(key);
}

/**
 * Aplica overrides simples de query params sobre las sample vars. Solo
 * sobreescribe strings/numbers (no objetos complejos). Es best-effort para
 * iteración rápida de copy sin tener que editar el código.
 */
function mergeOverrides(
  base: Record<string, unknown>,
  searchParams: Record<string, string | string[] | undefined>
): Record<string, unknown> {
  const merged = { ...base };
  for (const [k, v] of Object.entries(searchParams)) {
    if (typeof v === "string" && k in merged) {
      // Si la var original era number, lo coercemos.
      const original = merged[k];
      if (typeof original === "number") {
        const n = Number(v);
        if (Number.isFinite(n)) merged[k] = n;
      } else {
        merged[k] = v;
      }
    }
  }
  return merged;
}

export default async function EmailPreviewDetailPage({
  params,
  searchParams,
}: Props) {
  const { key } = params;
  if (!isValidTemplateKey(key)) {
    notFound();
  }

  const meta = TEMPLATE_METADATA[key];
  const sampleVars = TEMPLATE_SAMPLE_VARS[key] as Record<string, unknown>;
  const mergedVars = mergeOverrides(sampleVars, searchParams);

  // Renderizar el template con las variables. El `as` es necesario porque
  // mergeOverrides devuelve un objeto genérico; sabemos que tiene la shape
  // correcta porque partimos de TEMPLATE_SAMPLE_VARS tipado.
  const rendered = await renderTemplate(
    key,
    mergedVars as TemplateMap[typeof key]
  );

  const varEntries = Object.entries(mergedVars).map(([k, v]) => ({
    key: k,
    value: typeof v === "string" || typeof v === "number" ? String(v) : "[obj]",
  }));

  return (
    <div className="space-y-6">
      <Link
        href="/staff/email-preview"
        className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a la lista
      </Link>

      <div>
        <div className="font-mono text-xs text-gray-500">{key}</div>
        <h1 className="mt-1 font-serif text-2xl tracking-tight text-dark">
          {rendered.subject}
        </h1>
        <p className="mt-1 text-sm text-gray-600">{meta.description}</p>
        <div className="mt-2 text-xs text-gray-500">
          <span className="font-medium">Trigger:</span> {meta.trigger}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            Preview HTML
          </h2>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
            <iframe
              srcDoc={rendered.html}
              title={`Preview ${key}`}
              className="h-[640px] w-full bg-white"
              sandbox=""
            />
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            Variables aplicadas
          </h2>
          <p className="text-xs text-gray-500">
            Override en la URL: <code className="font-mono">?firstName=Maria</code>
          </p>
          <dl className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
            {varEntries.map((v) => (
              <div
                key={v.key}
                className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-baseline sm:gap-3"
              >
                <dt className="text-xs font-mono text-gray-500 sm:w-32 shrink-0">
                  {v.key}
                </dt>
                <dd className="text-xs text-gray-800 break-words">{v.value}</dd>
              </div>
            ))}
          </dl>

          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 pt-2">
            Plain text
          </h2>
          <pre className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs leading-relaxed text-gray-700 overflow-auto max-h-80 whitespace-pre-wrap">
            {rendered.text || "(sin versión plain-text)"}
          </pre>
        </div>
      </div>
    </div>
  );
}
