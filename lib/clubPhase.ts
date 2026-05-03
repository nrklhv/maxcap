// =============================================================================
// Club de Inversionistas — fases del ciclo y labels para el landing
// =============================================================================
// Las constantes de fechas viven en `lib/site.ts`. Acá solo hay derivaciones
// puras (sin side-effects) que el landing consume para pintar copy dinámico.
// =============================================================================

import { CLUB_CLOSE_DATE, CLUB_OPEN_DATE } from "./site";

export type ClubPhase = "pre-launch" | "open" | "closing-soon" | "closed";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
/** Cuántos días antes del cierre se considera "closing-soon" (countdown). */
const CLOSING_SOON_DAYS = 30;

/** Devuelve la fase actual del Club según `now` (default: ahora). */
export function getClubPhase(now: Date = new Date()): ClubPhase {
  if (now < CLUB_OPEN_DATE) return "pre-launch";
  if (now > CLUB_CLOSE_DATE) return "closed";
  const daysToClose = Math.ceil(
    (CLUB_CLOSE_DATE.getTime() - now.getTime()) / MS_PER_DAY
  );
  return daysToClose <= CLOSING_SOON_DAYS ? "closing-soon" : "open";
}

/** Días que faltan para el cierre (positivo si aún no cierra; 0 o negativo si ya cerró). */
export function daysUntilClose(now: Date = new Date()): number {
  return Math.max(
    0,
    Math.ceil((CLUB_CLOSE_DATE.getTime() - now.getTime()) / MS_PER_DAY)
  );
}

/** Devuelve un label corto para mostrar en la banda de cupos del hero,
 *  según la fase. El call-site puede sobreescribirlo si quiere copy distinto. */
export function getClubPhaseLabel(now: Date = new Date()): {
  short: string;
  long: string;
  emphasisColor: "orange" | "red" | "gray";
} {
  const phase = getClubPhase(now);
  switch (phase) {
    case "pre-launch": {
      const formatted = formatDateEs(CLUB_OPEN_DATE);
      return {
        short: `Apertura · ${formatted}`,
        long: `Apertura del Club el ${formatted}`,
        emphasisColor: "orange",
      };
    }
    case "open": {
      const formatted = formatDateEs(CLUB_CLOSE_DATE);
      return {
        short: `Cierra · ${formatted}`,
        long: `El Club cierra el ${formatted}`,
        emphasisColor: "orange",
      };
    }
    case "closing-soon": {
      const days = daysUntilClose(now);
      return {
        short: `Faltan ${days} día${days === 1 ? "" : "s"}`,
        long: `Faltan ${days} día${days === 1 ? "" : "s"} para cerrar el Club`,
        emphasisColor: "red",
      };
    }
    case "closed":
      return {
        short: "Cupos cerrados",
        long: "El Club cerró sus cupos para esta camada",
        emphasisColor: "gray",
      };
  }
}

/** Formatea una fecha en español (ej. "1 de junio", "28 de septiembre"). */
function formatDateEs(date: Date): string {
  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "long",
    timeZone: "America/Santiago",
  }).format(date);
}
