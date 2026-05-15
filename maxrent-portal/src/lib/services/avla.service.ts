/**
 * Integración con AVLA "seguro de crédito" para "preaprobación AVLA".
 *
 * Definición de negocio: un inversionista está **preaprobado por AVLA** si,
 * al solicitar una línea de crédito mínima (1 UF) bajo la póliza de Houm,
 * AVLA NO devuelve un rechazo automático. Cualquier otro estado intermedio
 * (reestudio, en evaluación, etc.) o aprobación automática cuenta como
 * "preaprobado" para nuestros propósitos.
 *
 * El check se dispara MANUALMENTE desde el panel de staff, NO automático.
 *
 * Decisiones de diseño:
 * - Cero retry. AVLA es flaky; si falla, staff vuelve a apretar el botón.
 * - 1-2 polls rápidos (5s entre ellos, total ~10s). Si no resuelve en ese
 *   tiempo, igual evaluamos el estado parcial que tengamos.
 * - JWT NO se cachea entre requests. Cada check hace login + logout para no
 *   acumular sesiones (AVLA limita a 20 activas).
 *
 * Spike previo y aprendizajes: spike/avla-integration (rama), commits con
 * tag spike(avla):*. Documentación oficial AVLA: see docs/AVLA.md.
 *
 * @domain avla / staff
 */

interface AvlaCredentials {
  baseUrl: string;
  appName: string;
  organizationUnitName: string;
  /** Username en base64 (formato que usa Houm). */
  usernameBase64: string;
  /** Password en base64. */
  passwordBase64: string;
}

interface LoginResponse {
  token?: string;
  success?: boolean;
  [k: string]: unknown;
}

interface PolicyRow {
  policyId: number;
  proposalNumber: string;
  policyNumber: string | null;
  stateDto?: { name?: string };
}

interface DebtorRow {
  personIdentityId: number;
  identityField: string;
  completeName?: string;
}

interface RequestLineResponse {
  lineId?: number | null;
  state?: string | null;
  [k: string]: unknown;
}

interface LineDetailsResponse {
  lineId?: number;
  state?: string;
  stateDto?: {
    name?: string;
    finalState?: boolean;
    tags?: Array<{ name: string }>;
  };
  stateTags?: string[];
  approvedAmount?: number | null;
  approvalTypeNumber?: number | null;
  [k: string]: unknown;
}

/**
 * Resultado de un check completo de AVLA. Lo que persistimos en `AvlaCheck`.
 */
export interface AvlaCheckResult {
  /** True si AVLA NO devolvió rechazo automático. Null si el check falló. */
  preapproved: boolean | null;
  avlaLineId: bigint | null;
  state: string | null;
  stateTags: string[];
  errorMessage: string | null;
  /** Respuesta cruda del último response para auditoría. */
  rawResponse: unknown;
}

const REJECTED_TAGS = new Set([
  "rejectedState",
  "automaticallyRejectedState",
  "rejected",
]);

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------

function readCredentials(): AvlaCredentials {
  const required = {
    AVLA_BASE_URL: process.env.AVLA_BASE_URL?.trim(),
    AVLA_COMPANY: process.env.AVLA_COMPANY?.trim(),
    AVLA_USER: process.env.AVLA_USER?.trim(),
    AVLA_PASSWORD: process.env.AVLA_PASSWORD?.trim(),
    AVLA_APP_NAME: process.env.AVLA_APP_NAME?.trim(),
  };
  const missing = Object.entries(required)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length > 0) {
    throw new Error(`AVLA env vars faltantes: ${missing.join(", ")}`);
  }
  return {
    baseUrl: required.AVLA_BASE_URL!.replace(/\/$/, ""),
    appName: required.AVLA_APP_NAME!,
    organizationUnitName: required.AVLA_COMPANY!,
    usernameBase64: required.AVLA_USER!,
    passwordBase64: required.AVLA_PASSWORD!,
  };
}

/** Predicado para skipear en build (evita romper `prisma generate` cuando no hay env). */
export function isAvlaConfigured(): boolean {
  return Boolean(
    process.env.AVLA_BASE_URL &&
      process.env.AVLA_COMPANY &&
      process.env.AVLA_USER &&
      process.env.AVLA_PASSWORD &&
      process.env.AVLA_APP_NAME
  );
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

async function avlaFetch<T>(
  url: string,
  init: RequestInit
): Promise<{ ok: boolean; status: number; body: T; rawText: string }> {
  const res = await fetch(url, init);
  const rawText = await res.text();
  let body: unknown;
  try {
    body = rawText ? JSON.parse(rawText) : null;
  } catch {
    body = null;
  }
  return { ok: res.ok, status: res.status, body: body as T, rawText };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// RUT helpers
// ---------------------------------------------------------------------------

/** Convierte "12345678-9" o "12.345.678-9" a "CL123456789". */
export function formatRutForAvla(rut: string): string {
  const cleaned = rut.replace(/^CL/i, "").replace(/[.\-\s]/g, "").toUpperCase();
  if (!/^\d+[\dK]$/.test(cleaned)) {
    throw new Error(`RUT inválido: "${rut}"`);
  }
  return `CL${cleaned}`;
}

function splitName(full: string): {
  names: string;
  secondNames: string | null;
  lastNames: string | null;
  secondLastNames: string | null;
} {
  const parts = full.trim().split(/\s+/);
  return {
    names: parts[0] || "",
    secondNames: parts[1] ?? null,
    lastNames: parts[2] ?? null,
    secondLastNames: parts[3] ?? null,
  };
}

// ---------------------------------------------------------------------------
// API calls de bajo nivel
// ---------------------------------------------------------------------------

async function login(creds: AvlaCredentials): Promise<string> {
  const res = await avlaFetch<LoginResponse>(
    `${creds.baseUrl}/access-control/login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appName: creds.appName,
        encrypted: true,
        organizationUnitName: creds.organizationUnitName,
        username: creds.usernameBase64,
        password: creds.passwordBase64,
      }),
    }
  );
  if (!res.ok || !res.body?.token) {
    throw new Error(
      `AVLA login falló (status ${res.status}): ${res.rawText.slice(0, 200)}`
    );
  }
  return res.body.token;
}

async function logout(creds: AvlaCredentials, token: string): Promise<void> {
  // Best-effort; si falla, dejamos que el token expire naturalmente.
  try {
    await avlaFetch(`${creds.baseUrl}/access-control/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // ignore
  }
}

async function findFirstActivePolicy(
  creds: AvlaCredentials,
  token: string
): Promise<PolicyRow> {
  const url = new URL(
    `${creds.baseUrl}/api-segurocredito/findPoliciesByStateTagPaginated`
  );
  url.searchParams.set("limit", "10");
  url.searchParams.set("offset", "0");
  url.searchParams.set("stateTags", "canRequestLines");
  url.searchParams.set("cdCountry", "CL");

  const res = await avlaFetch<{ data?: PolicyRow[] }>(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`AVLA findPolicies falló (status ${res.status})`);
  }
  const first = res.body.data?.[0];
  if (!first) {
    throw new Error(
      "AVLA no devolvió pólizas con `canRequestLines` para esta cuenta"
    );
  }
  return first;
}

async function findOrCreateDebtor(
  creds: AvlaCredentials,
  token: string,
  rutFormatted: string,
  completeName: string
): Promise<number> {
  // Search first.
  const searchUrl = new URL(
    `${creds.baseUrl}/api-segurocredito/findPersonDebtorsPaginated`
  );
  searchUrl.searchParams.set("limit", "5");
  searchUrl.searchParams.set("offset", "0");
  searchUrl.searchParams.set("cdCountry", "CL");
  searchUrl.searchParams.set("identityField", rutFormatted.replace(/^CL/, ""));
  const searchRes = await avlaFetch<{ data?: DebtorRow[] }>(
    searchUrl.toString(),
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!searchRes.ok) {
    throw new Error(`AVLA findPersonDebtors falló (status ${searchRes.status})`);
  }
  const existing = (searchRes.body.data ?? []).find(
    (d) => d.identityField === rutFormatted
  );
  if (existing) return existing.personIdentityId;

  // Create.
  const saveUrl = new URL(`${creds.baseUrl}/api-segurocredito/savePerson/`);
  saveUrl.searchParams.set("cdCountry", "CL");
  const nameParts = splitName(completeName);
  const body = {
    cdCountry: "CL",
    birthCountryCode: "CL",
    personIdentityTypeId: 1,
    identityField: rutFormatted,
    completeName,
    personType: "N",
    ...nameParts,
    addressesDtos: [{ countryId: 344, completeAddress: "—" }],
    contactsDtos: [{}],
    extraData: {},
  };
  const saveRes = await avlaFetch<{ personIdentityId?: number }>(
    saveUrl.toString(),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    }
  );
  if (!saveRes.ok || !saveRes.body?.personIdentityId) {
    throw new Error(
      `AVLA savePerson falló (status ${saveRes.status}): ${saveRes.rawText.slice(0, 200)}`
    );
  }
  return saveRes.body.personIdentityId;
}

async function requestLine(
  creds: AvlaCredentials,
  token: string,
  policy: PolicyRow,
  debtorId: number,
  amount: number,
  comment: string
): Promise<number> {
  const url = new URL(
    `${creds.baseUrl}/api-segurocredito/requestSingleLine/${policy.policyId}`
  );
  url.searchParams.set("cdCountry", "CL");
  const res = await avlaFetch<RequestLineResponse>(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      // ⚠️ La doc dice "requestAmount" pero el backend lee "requestedAmount"
      // (confirmado en el spike, ver docs/AVLA.md).
      requestedAmount: amount,
      debtorId,
      proposalNumber: policy.proposalNumber,
      policyNumber: policy.policyNumber,
      commentsFromPetitioner: comment,
    }),
  });
  if (!res.ok || !res.body?.lineId) {
    throw new Error(
      `AVLA requestSingleLine falló (status ${res.status}): ${res.rawText.slice(0, 200)}`
    );
  }
  return res.body.lineId;
}

async function getLineDetails(
  creds: AvlaCredentials,
  token: string,
  lineId: number
): Promise<LineDetailsResponse> {
  const res = await avlaFetch<LineDetailsResponse>(
    `${creds.baseUrl}/api-segurocredito/findLineWithPublicComments/${lineId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    throw new Error(
      `AVLA getLineDetails falló (status ${res.status}): ${res.rawText.slice(0, 200)}`
    );
  }
  return res.body;
}

// ---------------------------------------------------------------------------
// Lógica del filtro: extraer stateTags + decidir preaprobación
// ---------------------------------------------------------------------------

/**
 * Combina los stateTags string[] del nivel raíz con los tag.name dentro de
 * stateDto.tags (algunos endpoints devuelven una forma u otra).
 */
export function extractStateTags(details: LineDetailsResponse): string[] {
  const set = new Set<string>();
  if (Array.isArray(details.stateTags)) {
    for (const t of details.stateTags) if (typeof t === "string") set.add(t);
  }
  const stateDtoTags = details.stateDto?.tags;
  if (Array.isArray(stateDtoTags)) {
    for (const t of stateDtoTags) {
      if (t && typeof t.name === "string") set.add(t.name);
    }
  }
  return Array.from(set);
}

/** True si los tags incluyen algún estado de rechazo. */
export function isRejected(tags: string[]): boolean {
  return tags.some((t) => REJECTED_TAGS.has(t));
}

/**
 * Predicado de preaprobación según definición de negocio MaxRent:
 * - Si los tags incluyen `rejectedState` o `automaticallyRejectedState` → false (rechazado).
 * - Si NO los incluyen y hay algún tag de "evaluatedLinePortal" o cualquier
 *   otro estado intermedio → true (preaprobado).
 * - Si no hay tags todavía (raro), devuelve null (incierto).
 */
export function isPreapprovedFromTags(tags: string[]): boolean | null {
  if (tags.length === 0) return null;
  return !isRejected(tags);
}

// ---------------------------------------------------------------------------
// API pública del service: checkPreapproval
// ---------------------------------------------------------------------------

/**
 * Hace el check completo para un usuario y devuelve el resultado normalizado
 * listo para persistir en `AvlaCheck`. NO toca BD.
 *
 * Si AVLA falla en cualquier paso, devuelve `preapproved: null` con
 * `errorMessage` poblado (NO lanza). El caller decide qué guardar.
 */
export async function checkPreapproval(opts: {
  rut: string;
  completeName: string;
  amountInUF?: number;
  /** Email del staff que dispara (para audit en el comentario). */
  triggeredByStaffEmail?: string;
}): Promise<AvlaCheckResult> {
  const amount = opts.amountInUF ?? 1;
  const empty: AvlaCheckResult = {
    preapproved: null,
    avlaLineId: null,
    state: null,
    stateTags: [],
    errorMessage: null,
    rawResponse: null,
  };

  let creds: AvlaCredentials;
  try {
    creds = readCredentials();
  } catch (err) {
    return { ...empty, errorMessage: err instanceof Error ? err.message : String(err) };
  }

  const rutFormatted = (() => {
    try {
      return formatRutForAvla(opts.rut);
    } catch {
      return null;
    }
  })();
  if (!rutFormatted) {
    return { ...empty, errorMessage: `RUT inválido: "${opts.rut}"` };
  }

  let token: string | null = null;
  try {
    token = await login(creds);
    const policy = await findFirstActivePolicy(creds, token);
    const debtorId = await findOrCreateDebtor(
      creds,
      token,
      rutFormatted,
      opts.completeName
    );
    const comment = opts.triggeredByStaffEmail
      ? `MaxRent staff check by ${opts.triggeredByStaffEmail}`
      : "MaxRent staff check";
    const lineId = await requestLine(creds, token, policy, debtorId, amount, comment);

    // Polling rápido: 2 intentos, 5s entre ellos. Si después sigue sin tags
    // de rechazo, lo damos por preaprobado (el flujo de Houm también hace
    // este "snapshot temprano" — la línea puede seguir cambiando después).
    let lastDetails: LineDetailsResponse | null = null;
    for (let i = 0; i < 2; i++) {
      if (i > 0) await sleep(5000);
      lastDetails = await getLineDetails(creds, token, lineId);
      const tags = extractStateTags(lastDetails);
      if (isRejected(tags)) break; // rechazo confirmado, no sigo
      if (lastDetails.stateDto?.finalState === true) break; // estado terminal
    }

    const tags = extractStateTags(lastDetails ?? {});
    return {
      preapproved: isPreapprovedFromTags(tags),
      avlaLineId: BigInt(lineId),
      state: lastDetails?.stateDto?.name ?? lastDetails?.state ?? null,
      stateTags: tags,
      errorMessage: null,
      rawResponse: lastDetails,
    };
  } catch (err) {
    return { ...empty, errorMessage: err instanceof Error ? err.message : String(err) };
  } finally {
    if (token) await logout(creds, token);
  }
}
