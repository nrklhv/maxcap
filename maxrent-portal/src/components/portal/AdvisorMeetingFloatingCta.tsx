/**
 * Persistent, high-visibility CTA to open the external advisor scheduling URL
 * (e.g. Google Calendar appointment schedule, Calendly). Always shown in the investor
 * portal; if `href` is null, shows the same layout with a dev hint (set
 * NEXT_PUBLIC_ADVISOR_BOOKING_URL in .env.local).
 *
 * @domain portal
 * @see NEXT_PUBLIC_ADVISOR_BOOKING_URL
 */

import { Calendar } from "lucide-react";

export interface AdvisorMeetingFloatingCtaProps {
  /** Public booking URL, or null until env is configured */
  href: string | null;
}

export function AdvisorMeetingFloatingCta({ href }: AdvisorMeetingFloatingCtaProps) {
  const configured = Boolean(href?.trim());

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[100] lg:left-64 flex flex-col items-center gap-1 px-3 sm:px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6 bg-gradient-to-t from-white from-55% via-white/95 to-transparent pointer-events-none"
      role="region"
      aria-label="Agendar con asesor"
    >
      {configured ? (
        <a
          href={href!}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Agenda una reunión con un asesor financiero. Se abre en una nueva pestaña."
          className="pointer-events-auto flex w-full max-w-xl items-center justify-center gap-2 rounded-2xl border-2 border-blue-600 bg-blue-600 px-5 py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-blue-900/20 transition-colors hover:bg-blue-700 hover:border-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 sm:text-base"
        >
          <Calendar className="h-5 w-5 shrink-0 opacity-95" aria-hidden />
          <span className="leading-snug">
            Agenda una reunión con un{" "}
            <span className="whitespace-nowrap">asesor financiero</span>
          </span>
        </a>
      ) : (
        <div className="pointer-events-auto w-full max-w-xl rounded-2xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-center shadow-md sm:px-5 sm:py-3.5">
          <div className="flex items-center justify-center gap-2 text-sm font-bold text-amber-950 sm:text-base">
            <Calendar className="h-5 w-5 shrink-0" aria-hidden />
            <span>Agenda una reunión con un asesor financiero</span>
          </div>
          <p className="mt-1.5 text-xs leading-snug text-amber-900/90">
            Falta configurar la URL pública de agenda: definí{" "}
            <code className="rounded bg-amber-100/80 px-1 font-mono text-[0.7rem]">
              NEXT_PUBLIC_ADVISOR_BOOKING_URL
            </code>{" "}
            en <code className="rounded bg-amber-100/80 px-1 font-mono text-[0.7rem]">.env.local</code>{" "}
            (Google Calendar “Programación de citas”, Calendly, etc.) y reiniciá el servidor.
          </p>
        </div>
      )}
    </div>
  );
}
