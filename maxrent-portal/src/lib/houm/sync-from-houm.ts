/**
 * Fetches properties from Houm (M2M) and upserts rows in Prisma.
 * Supports list GET with optional query params, or per-id GET when `HOUM_PROPERTY_BY_ID_PATH` is set.
 *
 * @domain maxrent-portal
 * @see property.service — syncHoumIngestOneRow (draft queue + catalog updates)
 * @see docs/HOUM_CATALOG_METADATA.md
 */

import { fetchWithM2m, isM2mConfigured } from "@/lib/houm/m2m-token";
import {
  deriveTitle,
  houmPropertyKey,
  parseHoumPropertyList,
  parseHoumPropertySingle,
  type HoumPropertyRaw,
} from "@/lib/houm/houm-list-response";
import { catalogFlatPatchFromHoumRaw } from "@/lib/houm/houm-sync-metadata-flat";
import type { SyncFromHoumRequest } from "@/lib/houm/sync-from-houm-request";
import { syncFromHoumRequestSchema } from "@/lib/houm/sync-from-houm-request";
import * as propertyService from "@/lib/services/property.service";

/** Raised when `mode: "byIds"` but `HOUM_PROPERTY_BY_ID_PATH` is unset. */
export class HoumByIdPathMissingError extends Error {
  readonly code = "HOUM_BY_ID_PATH_MISSING" as const;

  constructor() {
    super(
      "Definí HOUM_PROPERTY_BY_ID_PATH (ej. /properties/{id}) para sincronizar por IDs Houm."
    );
    this.name = "HoumByIdPathMissingError";
  }
}

function apiBase(): string {
  const base = process.env.HOUM_API_BASE_URL?.trim().replace(/\/+$/, "");
  if (!base) throw new Error("Missing HOUM_API_BASE_URL");
  return base;
}

function listUrl(searchParams?: URLSearchParams): string {
  const base = apiBase();
  const path = (process.env.HOUM_PROPERTIES_LIST_PATH ?? "/properties").trim();
  const suffix = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(suffix, `${base}/`);
  if (searchParams) {
    searchParams.forEach((v, k) => {
      url.searchParams.set(k, v);
    });
  }
  return url.toString();
}

/**
 * Builds GET URL for one Houm property. Template must include `{id}` (encoded).
 * Example env: `/admin/v2/properties/{id}`
 */
function propertyByIdUrl(houmId: string): string {
  const template = process.env.HOUM_PROPERTY_BY_ID_PATH?.trim();
  if (!template) {
    throw new HoumByIdPathMissingError();
  }
  if (!template.includes("{id}")) {
    throw new Error("HOUM_PROPERTY_BY_ID_PATH debe contener el placeholder {id}");
  }
  const encoded = encodeURIComponent(houmId);
  const path = template.replace(/\{id\}/g, encoded);
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return new URL(suffix, `${apiBase()}/`).toString();
}

function readMaxSyncRows(): number {
  const raw = process.env.HOUM_SYNC_MAX_ROWS?.trim();
  const n = raw ? parseInt(raw, 10) : 500;
  if (!Number.isFinite(n) || n < 1) return 500;
  return Math.min(n, 5000);
}

const BY_ID_CONCURRENCY = 5;

async function upsertRawRow(
  raw: HoumPropertyRaw,
  errors: string[]
): Promise<propertyService.HoumIngestOutcome | null> {
  const key = houmPropertyKey(raw);
  try {
    const title = deriveTitle(raw);
    const patch = catalogFlatPatchFromHoumRaw(raw);
    const meta = { houm: raw, ...patch };
    return await propertyService.syncHoumIngestOneRow({
      houmPropertyId: key,
      title,
      metadata: meta,
    });
  } catch (err) {
    errors.push(`${key}: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

async function fetchListRows(url: string): Promise<HoumPropertyRaw[]> {
  const res = await fetchWithM2m(url, {
    method: "GET",
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Houm list failed: ${res.status} ${body.slice(0, 400)}`);
  }
  const json: unknown = await res.json();
  try {
    return parseHoumPropertyList(json);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Invalid Houm list JSON shape: ${msg}`);
  }
}

async function fetchOneRow(url: string): Promise<HoumPropertyRaw> {
  const res = await fetchWithM2m(url, {
    method: "GET",
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status} ${body.slice(0, 200)}`);
  }
  const json: unknown = await res.json();
  return parseHoumPropertySingle(json);
}

/**
 * Runs async tasks with limited concurrency (pool).
 */
async function runPool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let cursor = 0;
  const n = items.length;
  async function worker(): Promise<void> {
    while (true) {
      const i = cursor;
      cursor += 1;
      if (i >= n) return;
      await fn(items[i]);
    }
  }
  const workers = Math.min(Math.max(1, limit), n);
  await Promise.all(Array.from({ length: workers }, () => worker()));
}

export type SyncFromHoumResult = {
  ok: true;
  mode: "list" | "byIds";
  /** Rows actually upserted (after truncation in list mode). */
  fetched: number;
  /** List mode: total rows returned by Houm before applying HOUM_SYNC_MAX_ROWS. */
  totalReceived?: number;
  truncated: boolean;
  warning: string | null;
  /** Official `Property` rows updated in place (already linked to this Houm id). */
  catalogPropertiesUpdated: number;
  /** New staging drafts created from Houm. */
  draftsCreated: number;
  /** Existing staging drafts refreshed (pending / reopened from rejected). */
  draftsUpdated: number;
  errors: string[];
};

export async function syncPropertiesFromHoum(
  input?: SyncFromHoumRequest | null
): Promise<SyncFromHoumResult> {
  const opts = syncFromHoumRequestSchema.parse(input ?? {});

  if (!isM2mConfigured()) {
    throw new Error(
      "M2M not configured (AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_API_AUDIENCE)"
    );
  }

  const errors: string[] = [];
  let catalogPropertiesUpdated = 0;
  let draftsCreated = 0;
  let draftsUpdated = 0;
  const maxRows = readMaxSyncRows();

  function tally(outcome: propertyService.HoumIngestOutcome | null) {
    if (!outcome) return;
    if (outcome.kind === "property") catalogPropertiesUpdated += 1;
    else if (outcome.action === "created") draftsCreated += 1;
    else draftsUpdated += 1;
  }

  if (opts.mode === "byIds") {
    const uniqueIds = Array.from(new Set(opts.houmIds ?? []));
    let fetched = 0;

    await runPool(uniqueIds, BY_ID_CONCURRENCY, async (id) => {
      const url = propertyByIdUrl(id);
      try {
        const raw = await fetchOneRow(url);
        tally(await upsertRawRow(raw, errors));
        fetched += 1;
      } catch (e) {
        errors.push(`${id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    });

    return {
      ok: true,
      mode: "byIds" as const,
      fetched,
      truncated: false,
      warning: null,
      catalogPropertiesUpdated,
      draftsCreated,
      draftsUpdated,
      errors,
    };
  }

  const params = new URLSearchParams();
  if (opts.listQuery) {
    for (const [k, v] of Object.entries(opts.listQuery)) {
      params.set(k, v);
    }
  }
  const url = listUrl(params);
  let rows = await fetchListRows(url);
  const totalReceived = rows.length;
  let truncated = false;
  let warning: string | null = null;

  if (rows.length > maxRows) {
    truncated = true;
    warning = `Houm devolvió ${totalReceived} filas; se procesaron solo las primeras ${maxRows} (límite HOUM_SYNC_MAX_ROWS). Ajustá filtros en la API o aumentá el límite con cuidado.`;
    rows = rows.slice(0, maxRows);
  }

  for (const raw of rows) {
    tally(await upsertRawRow(raw, errors));
  }

  return {
    ok: true,
    mode: "list" as const,
    fetched: rows.length,
    totalReceived: truncated ? totalReceived : undefined,
    truncated,
    warning,
    catalogPropertiesUpdated,
    draftsCreated,
    draftsUpdated,
    errors,
  };
}
