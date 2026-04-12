/** Barra fija en viewport móvil (oculta desde `md:`). CTA con enlace a `#form`; scroll suave vía `html` en globals. */
export function MobileLeadBar({ variant }: { variant: "inversionista" | "vendedor" }) {
  const inv = variant === "inversionista";
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[90] border-t border-gray-1 bg-white/95 px-4 pt-3 shadow-[0_-6px_28px_rgba(0,0,0,0.08)] backdrop-blur-md md:hidden"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}
      role="region"
      aria-label={inv ? "Reservar cupo" : "Inscribir propiedad"}
    >
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-3">
            {inv ? "Piloto exclusivo" : "Sin compromiso"}
          </p>
          <p className="truncate text-sm font-semibold text-dark">{inv ? "Reserva tu cupo" : "Inscribe tu propiedad"}</p>
        </div>
        <a
          href="#form"
          className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity active:opacity-90 ${
            inv ? "bg-orange hover:bg-[#E55A00]" : "bg-teal hover:bg-[#085041]"
          }`}
        >
          {inv ? "Reservar cupo" : "Inscribirme"}
        </a>
      </div>
    </div>
  );
}
