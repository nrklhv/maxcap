/**
 * Servicio de UF (Unidad de Fomento) chilena.
 *
 * Responsabilidades:
 *   - `fetchUfFromMindicador()`: trae el valor del día desde mindicador.cl.
 *   - `upsertUfRate()`: persiste idempotente en la tabla `UfRate`.
 *   - `getLatestUfRate()`: devuelve la UF más reciente cacheada (para usar
 *     en endpoints del portal que muestran "≈ $X CLP" al lado de cada UF).
 *
 * Filosofía: el portal NUNCA pega a mindicador en tiempo real durante una
 * request del usuario. Solo el cron diario refresca el cache. Si el cron
 * falla un día, usamos la última UF disponible (la UF se mueve ~0.01%/día,
 * un día de delay no es crítico).
 *
 * Helpers puros de conversión y formato viven en `src/lib/uf/format.ts` para
 * poder importarse desde Client Components sin arrastrar Prisma al bundle del
 * cliente. Este service los re-exporta para que el caller server-side pueda
 * importar todo desde un solo lugar.
 *
 * @domain uf
 * @see docs/UF_RATE.md
 */

import { prisma } from "@/lib/prisma";

export { convertUfToClp } from "@/lib/uf/format";

/** Endpoint público de mindicador.cl con la UF de hoy. */
const MINDICADOR_UF_URL = "https://mindicador.cl/api/uf";

/** Shape relevante del response de mindicador.cl (subset de los campos). */
interface MindicadorUfResponse {
  serie?: Array<{
    fecha: string; // "2026-05-15T03:00:00.000Z"
    valor: number; // 39458.12
  }>;
}

export interface UfFetchResult {
  date: Date;
  valueClp: number;
}

/**
 * Trae la UF del día desde mindicador.cl. Lanza si la respuesta no es OK
 * o si el shape no tiene los campos esperados.
 *
 * Acepta un fetcher inyectable para tests (default = `fetch` global).
 */
export async function fetchUfFromMindicador(
  fetcher: typeof fetch = fetch
): Promise<UfFetchResult> {
  const res = await fetcher(MINDICADOR_UF_URL, {
    headers: { Accept: "application/json" },
    // mindicador puede demorar; cap de seguridad.
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new Error(`mindicador.cl respondió ${res.status}`);
  }
  const body = (await res.json()) as MindicadorUfResponse;
  const latest = body.serie?.[0];
  if (!latest || typeof latest.valor !== "number" || !latest.fecha) {
    throw new Error("mindicador.cl: respuesta sin `serie[0].valor` o `serie[0].fecha`");
  }
  // Parseamos a Date y truncamos a día UTC (la unique key de UfRate es @db.Date).
  const parsed = new Date(latest.fecha);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`mindicador.cl: fecha inválida "${latest.fecha}"`);
  }
  const dateOnly = new Date(
    Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate())
  );
  return { date: dateOnly, valueClp: latest.valor };
}

/**
 * Upsert idempotente en `UfRate`. Re-correr el cron el mismo día actualiza
 * el valor (por si la UF se corrige) sin crear duplicados.
 */
export async function upsertUfRate(
  input: UfFetchResult,
  source = "mindicador.cl"
): Promise<{ date: Date; valueClp: string; source: string }> {
  const row = await prisma.ufRate.upsert({
    where: { date: input.date },
    create: {
      date: input.date,
      valueClp: input.valueClp,
      source,
    },
    update: {
      valueClp: input.valueClp,
      source,
    },
    select: { date: true, valueClp: true, source: true },
  });
  return {
    date: row.date,
    valueClp: row.valueClp.toString(),
    source: row.source,
  };
}

/**
 * Devuelve la UF más reciente cacheada. Si no hay ninguna en BD (caso muy
 * temprano post-deploy antes del primer cron), devuelve `null` y el caller
 * decide qué hacer (típicamente: no mostrar "≈ $X CLP" hasta que haya dato).
 */
export async function getLatestUfRate(): Promise<{
  date: Date;
  valueClp: number;
  source: string;
} | null> {
  const row = await prisma.ufRate.findFirst({
    orderBy: { date: "desc" },
    select: { date: true, valueClp: true, source: true },
  });
  if (!row) return null;
  return {
    date: row.date,
    valueClp: Number(row.valueClp),
    source: row.source,
  };
}

// `convertUfToClp` se re-exporta desde `@/lib/uf/format` arriba.
