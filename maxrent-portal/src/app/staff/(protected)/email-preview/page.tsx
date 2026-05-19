/**
 * Staff — listado de templates de email con preview.
 *
 * Cada template se renderiza con variables de ejemplo (mocks) y se muestra
 * en un iframe para ver cómo le llega al destinatario. Útil para revisar
 * copy + diseño sin tener que disparar el flow real ni esperar a Resend.
 *
 * @source GET /staff/email-preview
 * @domain staff
 */

import Link from "next/link";
import { Mail } from "lucide-react";
import { TEMPLATE_METADATA } from "./_metadata";

export default function EmailPreviewIndexPage() {
  const templates = Object.entries(TEMPLATE_METADATA);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl tracking-tight text-dark">
          Preview de emails
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-600">
          Todos los templates que el sistema envía a inversionistas. Cada
          preview usa variables de ejemplo. Para ver emails realmente enviados,
          mirá el{" "}
          <a
            href="https://resend.com/emails"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-blue-700 underline"
          >
            dashboard de Resend
          </a>
          .
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {templates.map(([key, meta]) => (
          <Link
            key={key}
            href={`/staff/email-preview/${key}`}
            className="group flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm transition hover:border-blue-200 hover:shadow"
          >
            <span className="mt-0.5 rounded-lg bg-blue-50 p-2 text-blue-700">
              <Mail className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-mono text-xs text-gray-500">{key}</div>
              <div className="mt-0.5 font-medium text-gray-900 group-hover:text-blue-700">
                {meta.subject}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-gray-600 line-clamp-2">
                {meta.description}
              </p>
              <div className="mt-2 text-[10px] font-medium uppercase tracking-wide text-gray-400">
                Trigger: {meta.trigger}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
