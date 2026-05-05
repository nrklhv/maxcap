// =============================================================================
// Referral / BrokerLead — generación de codes y creación / vinculación
// =============================================================================
//
// Service que centraliza:
//   1. Generación de códigos únicos para `User.investorReferralCode` y
//      `User.brokerReferralCode` (formato `INV-XXXXXX` / `BRK-XXXXXX`).
//   2. Creación idempotente de filas en `Referral` y `BrokerLead` cuando un
//      Lead llega al portal con atribución resuelta (gatillado desde
//      `/api/public/leads`).
//   3. Vinculación del referido / prospect cuando crea cuenta (transición de
//      status PENDING/NEW → SIGNED_UP, set de `referredUserId`/`prospectUserId`,
//      y para `BrokerLead` además set de `User.sponsorBrokerUserId`).
//
// Reglas de negocio (resumen — detalle en docs/DATABASE.md):
//   • `expiresAt` inicial: `createdAt + 60 días` (esperando signup).
//   • `expiresAt` post-signup: `signedUpAt + 120 días` (esperando escrituración).
//   • Reward Referral: `$500.000 CLP` fijo (default del schema; campo por si
//     en el futuro se hacen campañas con otros montos).
//   • Comisión BrokerLead: variable, fuera de schema (staff registra al pagar).
//   • First-touch: no se permite re-atribuir un Lead que ya tiene Referral/
//     BrokerLead (1:1 unique en `leadId`).
// =============================================================================

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

// -----------------------------------------------------------------------------
// Constantes de negocio
// -----------------------------------------------------------------------------

/** Días de gracia desde la captura del lead hasta crear cuenta. */
export const REFERRAL_PRE_SIGNUP_GRACE_DAYS = 60;

/** Días de gracia desde signup hasta escrituración. */
export const REFERRAL_POST_SIGNUP_GRACE_DAYS = 120;

/** Charset alfanumérico sin caracteres ambiguos (sin 0/O/1/I/L). */
const CODE_CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Longitud del cuerpo del code (sin contar el prefijo). 6 → ~887M combinaciones. */
const CODE_BODY_LENGTH = 6;

/** Máximo de intentos al generar un code único antes de tirar error. */
const CODE_MAX_GENERATION_ATTEMPTS = 8;

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function addDays(base: Date, days: number): Date {
  const d = new Date(base.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function randomCodeBody(length = CODE_BODY_LENGTH): string {
  const chars = CODE_CHARSET;
  // Web Crypto si está disponible (edge / browser); Node tiene globalThis.crypto en runtime moderno.
  const cryptoLike = (globalThis as unknown as { crypto?: Crypto }).crypto;
  if (cryptoLike?.getRandomValues) {
    const buf = new Uint32Array(length);
    cryptoLike.getRandomValues(buf);
    let out = "";
    for (let i = 0; i < length; i++) out += chars[buf[i] % chars.length];
    return out;
  }
  // Fallback poco probable (usado solo si no hay Web Crypto). Suficientemente
  // aleatorio para evitar colisiones; igual hay loop de retry por unicidad.
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

// -----------------------------------------------------------------------------
// Generación de codes únicos
// -----------------------------------------------------------------------------

/**
 * Genera un code único con el prefijo dado, verificando que no exista en
 * la columna correspondiente de `User`. Reintenta hasta
 * `CODE_MAX_GENERATION_ATTEMPTS` antes de tirar error.
 *
 * Internal — usar `ensureInvestorReferralCode` / `ensureBrokerReferralCode`.
 */
async function generateUniqueCode(
  prefix: "INV" | "BRK"
): Promise<string> {
  for (let attempt = 0; attempt < CODE_MAX_GENERATION_ATTEMPTS; attempt++) {
    const candidate = `${prefix}-${randomCodeBody()}`;
    const existing =
      prefix === "INV"
        ? await prisma.user.findUnique({
            where: { investorReferralCode: candidate },
            select: { id: true },
          })
        : await prisma.user.findUnique({
            where: { brokerReferralCode: candidate },
            select: { id: true },
          });
    if (!existing) return candidate;
  }
  throw new Error(
    `No se pudo generar un code ${prefix}- único tras ${CODE_MAX_GENERATION_ATTEMPTS} intentos`
  );
}

/**
 * Si el User no tiene `investorReferralCode`, lo genera y persiste.
 * Idempotente: si ya tiene uno, retorna el existente.
 *
 * Llamado desde:
 *   • `events.createUser` de NextAuth (todo nuevo User entra con canInvest=true).
 *   • Cualquier futuro flujo que cambie `canInvest` de false a true.
 */
export async function ensureInvestorReferralCode(
  userId: string
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { investorReferralCode: true, canInvest: true },
  });
  if (!user) {
    throw new Error(`User ${userId} no existe`);
  }
  if (user.investorReferralCode) return user.investorReferralCode;
  if (!user.canInvest) {
    // No generar code para cuentas que no son inversionistas (defensivo).
    throw new Error(`User ${userId} no tiene canInvest=true`);
  }
  const code = await generateUniqueCode("INV");
  await prisma.user.update({
    where: { id: userId },
    data: { investorReferralCode: code },
  });
  return code;
}

/**
 * Si el User no tiene `brokerReferralCode`, lo genera y persiste.
 * Idempotente. Llamado desde `approveBroker()` después de la transición a APPROVED.
 */
export async function ensureBrokerReferralCode(
  userId: string
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { brokerReferralCode: true, brokerAccessStatus: true },
  });
  if (!user) {
    throw new Error(`User ${userId} no existe`);
  }
  if (user.brokerReferralCode) return user.brokerReferralCode;
  if (user.brokerAccessStatus !== "APPROVED") {
    throw new Error(
      `User ${userId} no está APPROVED (brokerAccessStatus=${user.brokerAccessStatus})`
    );
  }
  const code = await generateUniqueCode("BRK");
  await prisma.user.update({
    where: { id: userId },
    data: { brokerReferralCode: code },
  });
  return code;
}

// -----------------------------------------------------------------------------
// Creación de Referral / BrokerLead al crear Lead atribuido
// -----------------------------------------------------------------------------

type CreateReferralInput = {
  leadId: string;
  code: string;
  referrerUserId: string;
  referredEmail: string;
};

/**
 * Crea o actualiza la fila `Referral` para un Lead recién atribuido. Idempotente
 * (1:1 con Lead vía leadId unique). Si ya existe Referral para ese leadId,
 * lo deja como está (first-touch — no overwriteamos referrer ni reset status).
 */
export async function createReferralForLead(
  input: CreateReferralInput
): Promise<void> {
  const now = new Date();
  await prisma.referral.upsert({
    where: { leadId: input.leadId },
    create: {
      leadId: input.leadId,
      code: input.code,
      referrerUserId: input.referrerUserId,
      referredEmail: input.referredEmail,
      status: "PENDING",
      expiresAt: addDays(now, REFERRAL_PRE_SIGNUP_GRACE_DAYS),
    },
    update: {
      // No-op — first-touch. Los datos del Referral existente mandan.
    },
  });
}

type CreateBrokerLeadInput = {
  leadId: string;
  code: string;
  brokerUserId: string;
  prospectEmail: string;
};

/**
 * Crea o actualiza la fila `BrokerLead`. Idempotente. Mismo principio
 * first-touch que `createReferralForLead`.
 */
export async function createBrokerLeadForLead(
  input: CreateBrokerLeadInput
): Promise<void> {
  const now = new Date();
  await prisma.brokerLead.upsert({
    where: { leadId: input.leadId },
    create: {
      leadId: input.leadId,
      code: input.code,
      brokerUserId: input.brokerUserId,
      prospectEmail: input.prospectEmail,
      status: "NEW",
      expiresAt: addDays(now, REFERRAL_PRE_SIGNUP_GRACE_DAYS),
    },
    update: {
      // No-op — first-touch.
    },
  });
}

// -----------------------------------------------------------------------------
// Vinculación del referido / prospect cuando crea cuenta
// -----------------------------------------------------------------------------

type LinkUserOptions = {
  userId: string;
  /** ID del Lead vinculado al User en este alta (de `User.leadId`). */
  leadId: string | null | undefined;
  /** Email del User (lowercase). Fallback para casos donde el Lead no se vincula directo. */
  email: string;
};

/**
 * Cuando un User crea cuenta y queda vinculado a un Lead que tenía atribución:
 *   • Setea `referredUserId` / `prospectUserId` en el Referral / BrokerLead.
 *   • Transiciona `status` PENDING/NEW → SIGNED_UP.
 *   • Actualiza `expiresAt` a `signedUpAt + 120 días` (regla post-signup).
 *   • Para BrokerLead: además setea `User.sponsorBrokerUserId` para mantener
 *     consistencia con el sistema de sponsorship existente.
 *
 * Idempotente. Si el Referral/BrokerLead ya está vinculado o ya pasó SIGNED_UP,
 * no hace nada.
 *
 * Llamado desde `events.createUser` de NextAuth y desde el provider Credentials
 * dev (que crea User manualmente).
 */
export async function linkUserToPendingAttribution(
  options: LinkUserOptions
): Promise<void> {
  const { userId, leadId, email } = options;
  const now = new Date();
  const newExpiresAt = addDays(now, REFERRAL_POST_SIGNUP_GRACE_DAYS);

  // Buscamos por leadId si existe (caso típico: el Lead ya estaba vinculado).
  // Si no, fallback por email matching contra `referredEmail`/`prospectEmail`.
  // Caso edge: signup directo sin pasar por landing (sin Lead) → no hace nada.

  // --- Referral ---
  const referral = leadId
    ? await prisma.referral.findUnique({
        where: { leadId },
        select: { id: true, status: true, referredUserId: true },
      })
    : await prisma.referral.findFirst({
        where: { referredEmail: email, referredUserId: null },
        select: { id: true, status: true, referredUserId: true },
      });

  if (referral && referral.status === "PENDING") {
    await prisma.referral.update({
      where: { id: referral.id },
      data: {
        referredUserId: userId,
        status: "SIGNED_UP",
        signedUpAt: now,
        expiresAt: newExpiresAt,
      },
    });
  } else if (referral && !referral.referredUserId) {
    // Si por alguna razón el status ya es post-PENDING (improbable) pero el
    // referredUserId está vacío, igual lo seteamos para mantener consistencia.
    await prisma.referral.update({
      where: { id: referral.id },
      data: { referredUserId: userId },
    });
  }

  // --- BrokerLead ---
  const brokerLead = leadId
    ? await prisma.brokerLead.findUnique({
        where: { leadId },
        select: {
          id: true,
          status: true,
          prospectUserId: true,
          brokerUserId: true,
        },
      })
    : await prisma.brokerLead.findFirst({
        where: { prospectEmail: email, prospectUserId: null },
        select: {
          id: true,
          status: true,
          prospectUserId: true,
          brokerUserId: true,
        },
      });

  if (brokerLead && brokerLead.status === "NEW") {
    await prisma.$transaction([
      prisma.brokerLead.update({
        where: { id: brokerLead.id },
        data: {
          prospectUserId: userId,
          status: "SIGNED_UP",
          signedUpAt: now,
          expiresAt: newExpiresAt,
        },
      }),
      // Sponsorship: el broker queda como sponsor de este inversionista. No
      // pisamos si ya hay sponsor seteado por otro flujo (BrokerInvestorInvite,
      // asignación staff). Solo se asigna si User.sponsorBrokerUserId es null.
      prisma.user.updateMany({
        where: { id: userId, sponsorBrokerUserId: null },
        data: {
          sponsorBrokerUserId: brokerLead.brokerUserId,
          sponsorBrokerAssignedAt: now,
        },
      }),
    ]);
  } else if (brokerLead && !brokerLead.prospectUserId) {
    await prisma.brokerLead.update({
      where: { id: brokerLead.id },
      data: { prospectUserId: userId },
    });
  }
}

// -----------------------------------------------------------------------------
// Trigger de payout al escriturar (gatillado por staff desde una Reservation)
// -----------------------------------------------------------------------------

/**
 * Resumen de transiciones aplicadas por `triggerEscrituraPayouts`.
 * Útil para devolver al staff qué se actualizó y mostrarlo en UI.
 */
export type EscrituraPayoutResult = {
  /** ID del Referral que pasó a SIGNED, si existía. */
  referralId: string | null;
  /** ID del BrokerLead que pasó a CONTRACT_SIGNED, si existía. */
  brokerLeadId: string | null;
};

/**
 * Cuando un User escritura una propiedad del Club (transición de su
 * `Reservation` a `CONFIRMED`), gatillamos los payouts de su atribución:
 *   • Referral: PENDING/SIGNED_UP/QUALIFIED → SIGNED, signedAt = now,
 *     payoutStatus = PENDING (queda esperando que staff transfiera los
 *     $500.000 al referidor).
 *   • BrokerLead: NEW/SIGNED_UP/QUALIFIED → CONTRACT_SIGNED, contractSignedAt = now,
 *     payoutStatus = PENDING (staff pagará la comisión variable acordada).
 *
 * Idempotente: si ya está en SIGNED/CONTRACT_SIGNED o EXPIRED/LOST, no toca nada.
 * Si no hay Referral ni BrokerLead asociado al User, retorna `{ null, null }` sin error.
 */
export async function triggerEscrituraPayouts(
  userId: string
): Promise<EscrituraPayoutResult> {
  const now = new Date();
  const result: EscrituraPayoutResult = {
    referralId: null,
    brokerLeadId: null,
  };

  // --- Referral (User como referido) ---
  const referral = await prisma.referral.findUnique({
    where: { referredUserId: userId },
    select: { id: true, status: true },
  });
  if (
    referral &&
    (referral.status === "PENDING" ||
      referral.status === "SIGNED_UP" ||
      referral.status === "QUALIFIED")
  ) {
    await prisma.referral.update({
      where: { id: referral.id },
      data: {
        status: "SIGNED",
        signedAt: now,
        // payoutStatus ya viene PENDING por default; lo dejamos explícito por
        // claridad en caso de re-trigger desde un estado raro.
        payoutStatus: "PENDING",
      },
    });
    result.referralId = referral.id;
  }

  // --- BrokerLead (User como prospect) ---
  const brokerLead = await prisma.brokerLead.findUnique({
    where: { prospectUserId: userId },
    select: { id: true, status: true },
  });
  if (
    brokerLead &&
    (brokerLead.status === "NEW" ||
      brokerLead.status === "SIGNED_UP" ||
      brokerLead.status === "QUALIFIED")
  ) {
    await prisma.brokerLead.update({
      where: { id: brokerLead.id },
      data: {
        status: "CONTRACT_SIGNED",
        contractSignedAt: now,
        payoutStatus: "PENDING",
      },
    });
    result.brokerLeadId = brokerLead.id;
  }

  return result;
}

// -----------------------------------------------------------------------------
// Job nocturno: expirar atribuciones vencidas
// -----------------------------------------------------------------------------

/** Conteo de filas afectadas por la corrida de expiración. */
export type ExpirationResult = {
  referralsExpired: number;
  brokerLeadsLost: number;
};

/**
 * Recorre Referrals y BrokerLeads con `expiresAt < now` y status no terminal,
 * y los marca como `EXPIRED` / `LOST`. Llamado por:
 *   • Vercel Cron diario (`/api/cron/referrals/expire`).
 *   • Manualmente por staff si hace falta.
 *
 * Idempotente: las filas ya en estado terminal (SIGNED / EXPIRED para Referral,
 * CONTRACT_SIGNED / LOST para BrokerLead) están excluidas del WHERE.
 *
 * No toca `payoutStatus` porque las atribuciones expiradas NO generan payout
 * (no se puede revivir el flujo después de EXPIRED).
 */
export async function expireOverdueAttributions(): Promise<ExpirationResult> {
  const now = new Date();

  const [referralsExpired, brokerLeadsLost] = await prisma.$transaction([
    prisma.referral.updateMany({
      where: {
        expiresAt: { lt: now },
        status: { in: ["PENDING", "SIGNED_UP", "QUALIFIED"] },
      },
      data: { status: "EXPIRED" },
    }),
    prisma.brokerLead.updateMany({
      where: {
        expiresAt: { lt: now },
        status: { in: ["NEW", "SIGNED_UP", "QUALIFIED"] },
      },
      data: { status: "LOST" },
    }),
  ]);

  return {
    referralsExpired: referralsExpired.count,
    brokerLeadsLost: brokerLeadsLost.count,
  };
}

// -----------------------------------------------------------------------------
// Errores tolerables
// -----------------------------------------------------------------------------

/**
 * Wrapper para usar en hooks de NextAuth: si la operación falla, loguea pero
 * NO rompe el alta del usuario / login. La atribución es feature lateral —
 * preferimos perder un Referral antes que bloquear el login.
 */
export async function safeRunReferralHook<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      console.error(`[referral.service] ${label} — Prisma error`, {
        code: err.code,
        meta: err.meta,
      });
    } else {
      console.error(`[referral.service] ${label}`, err);
    }
    return null;
  }
}
