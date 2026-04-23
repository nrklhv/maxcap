import {
  Prisma,
  type PropertyCatalogDraft,
  type Property,
  type Reservation,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { INVESTOR_ACTIVE_RESERVATION_STATUSES } from "@/lib/portal/investor-active-reservation-statuses";

/** Legacy metadata keys (broker direct holds removed; still stripped on sync / staff PATCH). */
export const BROKER_RESERVED_BY_USER_ID_KEY = "brokerReservedByUserId";
export const BROKER_RESERVED_AT_KEY = "brokerReservedAt";

/** Internal metadata keys when an investor hold is synced onto `Property` (not CSV columns). */
export const INVESTOR_RESERVATION_ID_KEY = "investorReservationId";
export const INVESTOR_RESERVED_BY_USER_ID_KEY = "investorReservedByUserId";
export const INVESTOR_RESERVED_AT_KEY = "investorReservedAt";

function asMetadataObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) };
  }
  return {};
}

/** Safe parse of `Property.metadata` for API routes (no Prisma import needed). */
export function propertyMetadataAsRecord(value: unknown): Record<string, unknown> {
  return asMetadataObject(value);
}

function stripBrokerReservationMeta(obj: Record<string, unknown>): Record<string, unknown> {
  const out = { ...obj };
  delete out[BROKER_RESERVED_BY_USER_ID_KEY];
  delete out[BROKER_RESERVED_AT_KEY];
  return out;
}

function stripInvestorReservationMeta(obj: Record<string, unknown>): Record<string, unknown> {
  const out = { ...obj };
  delete out[INVESTOR_RESERVATION_ID_KEY];
  delete out[INVESTOR_RESERVED_BY_USER_ID_KEY];
  delete out[INVESTOR_RESERVED_AT_KEY];
  return out;
}

function stripAllReservationHoldMeta(obj: Record<string, unknown>): Record<string, unknown> {
  return stripBrokerReservationMeta(stripInvestorReservationMeta(obj));
}

function mergeHoumMetadataIntoProperty(
  existingMetadata: unknown,
  incoming: unknown
): Prisma.InputJsonValue {
  const prev = asMetadataObject(existingMetadata);
  const incomingObj = asMetadataObject(incoming);
  const merged: Record<string, unknown> = { ...prev, ...incomingObj };
  return merged as Prisma.InputJsonValue;
}

function defaultVisibleToBrokersFromEnv(): boolean {
  return process.env.HOUM_SYNC_DEFAULT_VISIBLE_TO_BROKERS === "true";
}

export async function listPropertiesForAdmin() {
  return prisma.property.findMany({
    orderBy: { updatedAt: "desc" },
  });
}

export type StaffInventoryReservationSummary = {
  channel: "broker" | "investor";
  userId: string;
  email: string | null;
  name: string | null;
  reservedAt: string | null;
};

export type PropertyWithStaffReservationSummary = Property & {
  staffReservationSummary: StaffInventoryReservationSummary | null;
};

/**
 * Heals drift between active investor `Reservation` rows and `Property` (status + metadata).
 * Run before staff inventory so listings match the inversionista portal (`Reservation` is source of truth for holds).
 */
export async function syncActiveInvestorReservationHoldsToPropertyRows(): Promise<void> {
  const active = await prisma.reservation.findMany({
    where: { status: { in: [...INVESTOR_ACTIVE_RESERVATION_STATUSES] } },
    select: { propertyId: true },
  });
  const ids = Array.from(new Set(active.map((r) => r.propertyId)));
  for (const propertyId of ids) {
    await reconcilePropertyAfterInvestorReservationChange(propertyId);
  }
}

/**
 * Admin inventory list with a “who holds it” summary for `RESERVED` rows (investor; legacy broker metadata may still appear until cleaned).
 */
export async function listPropertiesForStaffInventory(): Promise<PropertyWithStaffReservationSummary[]> {
  await syncActiveInvestorReservationHoldsToPropertyRows();
  const items = await listPropertiesForAdmin();
  const userIds = new Set<string>();
  for (const p of items) {
    if (p.status !== "RESERVED") continue;
    const m = asMetadataObject(p.metadata);
    const b = m[BROKER_RESERVED_BY_USER_ID_KEY];
    const i = m[INVESTOR_RESERVED_BY_USER_ID_KEY];
    if (typeof b === "string" && b.trim()) userIds.add(b.trim());
    if (typeof i === "string" && i.trim()) userIds.add(i.trim());
  }
  const users =
    userIds.size === 0
      ? []
      : await prisma.user.findMany({
          where: { id: { in: Array.from(userIds) } },
          select: { id: true, email: true, name: true },
        });
  const byId = new Map(users.map((u) => [u.id, u]));

  return items.map((p) => {
    let staffReservationSummary: StaffInventoryReservationSummary | null = null;
    if (p.status === "RESERVED") {
      const m = asMetadataObject(p.metadata);
      const brokerId =
        typeof m[BROKER_RESERVED_BY_USER_ID_KEY] === "string"
          ? m[BROKER_RESERVED_BY_USER_ID_KEY]!.trim()
          : "";
      const investorId =
        typeof m[INVESTOR_RESERVED_BY_USER_ID_KEY] === "string"
          ? m[INVESTOR_RESERVED_BY_USER_ID_KEY]!.trim()
          : "";
      if (brokerId) {
        const u = byId.get(brokerId);
        const atRaw = m[BROKER_RESERVED_AT_KEY];
        const reservedAt =
          typeof atRaw === "string" && atRaw.trim() ? atRaw.trim() : null;
        staffReservationSummary = {
          channel: "broker",
          userId: brokerId,
          email: u?.email ?? null,
          name: u?.name ?? null,
          reservedAt,
        };
      } else if (investorId) {
        const u = byId.get(investorId);
        const atRaw = m[INVESTOR_RESERVED_AT_KEY];
        const reservedAt =
          typeof atRaw === "string" && atRaw.trim() ? atRaw.trim() : null;
        staffReservationSummary = {
          channel: "investor",
          userId: investorId,
          email: u?.email ?? null,
          name: u?.name ?? null,
          reservedAt,
        };
      }
    }
    return { ...p, staffReservationSummary };
  });
}

/** Staff «Reservas»: active investor `Reservation` rows only (broker direct property holds removed). */
export type StaffUnifiedReservationRow = {
  propertyId: string;
  propertyTitle: string;
  inventoryCode: string | null;
  visibleToBrokers: boolean;
  reservationId: string;
  reservationStatus: string;
  amount: string;
  currency: string;
  actorUserId: string;
  actorEmail: string | null;
  actorName: string | null;
  reservedAt: string | null;
};

/**
 * Active investor reservations for Staff «Reservas» (unified list; broker-only `Property` holds no longer exist in product).
 */
export async function listUnifiedStaffReservationsForStaff(): Promise<
  StaffUnifiedReservationRow[]
> {
  const invReservations = await prisma.reservation.findMany({
    where: { status: { in: [...INVESTOR_ACTIVE_RESERVATION_STATUSES] } },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  const propertyIds = Array.from(new Set(invReservations.map((r) => r.propertyId)));
  const properties =
    propertyIds.length === 0
      ? []
      : await prisma.property.findMany({
          where: { id: { in: propertyIds } },
          select: { id: true, title: true, inventoryCode: true, visibleToBrokers: true },
        });
  const propById = new Map(properties.map((p) => [p.id, p]));

  type WithSort = StaffUnifiedReservationRow & { sortTs: number };
  const merged: WithSort[] = [];

  for (const r of invReservations) {
    const prop = propById.get(r.propertyId);
    merged.push({
      propertyId: r.propertyId,
      propertyTitle: prop?.title ?? r.propertyName ?? r.propertyId,
      inventoryCode: prop?.inventoryCode ?? null,
      visibleToBrokers: prop?.visibleToBrokers ?? false,
      reservationId: r.id,
      reservationStatus: r.status,
      amount: r.amount.toString(),
      currency: r.currency,
      actorUserId: r.userId,
      actorEmail: r.user.email,
      actorName: r.user.name,
      reservedAt: r.createdAt.toISOString(),
      sortTs: r.createdAt.getTime(),
    });
  }

  merged.sort((a, b) => b.sortTs - a.sortTs);
  return merged.map((row) => {
    const { sortTs, ...rest } = row;
    void sortTs;
    return rest;
  });
}

/**
 * Published `AVAILABLE` rows visible to brokers (full inversionista + broker catálogo base).
 * Inversionista portal catalog uses this list so users still see properties where they hold an active `Reservation`.
 */
export async function listAvailablePropertiesForBrokers() {
  return prisma.property.findMany({
    where: {
      status: "AVAILABLE",
      visibleToBrokers: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}

async function getPropertyIdsWithActiveInvestorReservations(
  client: Pick<typeof prisma, "reservation"> = prisma
): Promise<string[]> {
  const rows = await client.reservation.findMany({
    where: { status: { in: [...INVESTOR_ACTIVE_RESERVATION_STATUSES] } },
    select: { propertyId: true },
  });
  return Array.from(new Set(rows.map((r) => r.propertyId)));
}

/**
 * Broker «Disponibles»: mismas filas que {@link listAvailablePropertiesForBrokers} menos
 * propiedades con reserva activa de inversionista (`Reservation`), para no competir con un hold ya iniciado.
 */
export async function listBrokerDisponiblesProperties() {
  const heldIds = await getPropertyIdsWithActiveInvestorReservations();
  const where: Prisma.PropertyWhereInput = {
    status: "AVAILABLE",
    visibleToBrokers: true,
  };
  if (heldIds.length > 0) {
    where.id = { notIn: heldIds };
  }
  return prisma.property.findMany({
    where,
    orderBy: { updatedAt: "desc" },
  });
}

/**
 * Investor catalog: published `AVAILABLE` rows plus any `Property` the user still holds
 * via an active `Reservation` (after sync those rows are `RESERVED` with investor metadata).
 */
export async function listInvestorCatalogProperties(userId: string): Promise<Property[]> {
  const base = await listAvailablePropertiesForBrokers();
  const activeRows = await prisma.reservation.findMany({
    where: {
      userId,
      status: { in: [...INVESTOR_ACTIVE_RESERVATION_STATUSES] },
    },
    select: { propertyId: true },
  });
  const heldIds = new Set(activeRows.map((r) => r.propertyId));
  const inBase = new Set(base.map((p) => p.id));
  const missing = Array.from(heldIds).filter((id) => !inBase.has(id));
  if (missing.length === 0) {
    return base;
  }
  const extra = await prisma.property.findMany({
    where: { id: { in: missing }, visibleToBrokers: true },
  });
  const merged = [...base, ...extra];
  merged.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  return merged;
}

/** @deprecated Prefer `listAvailablePropertiesForBrokers`. */
export async function listPropertiesForBrokers() {
  return listAvailablePropertiesForBrokers();
}

/**
 * Broker ficha: published `AVAILABLE` inventory only (reservations are via inversionista `Reservation`).
 */
export async function getPropertyForBroker(id: string, brokerUserId: string) {
  void brokerUserId;
  return prisma.property.findFirst({
    where: {
      id,
      visibleToBrokers: true,
      status: "AVAILABLE",
    },
  });
}

/**
 * Writes investor hold keys onto `Property` inside a DB transaction (single inventory state).
 */
export async function markPropertyReservedForInvestorSync(
  tx: Prisma.TransactionClient,
  propertyId: string,
  reservation: Pick<Reservation, "id" | "userId" | "createdAt">
): Promise<void> {
  const prop = await tx.property.findUnique({ where: { id: propertyId } });
  if (!prop) {
    throw new Error("Property not found for investor reservation sync");
  }
  const meta = asMetadataObject(prop.metadata);
  const nextMeta: Record<string, unknown> = {
    ...stripBrokerReservationMeta(meta),
    [INVESTOR_RESERVATION_ID_KEY]: reservation.id,
    [INVESTOR_RESERVED_BY_USER_ID_KEY]: reservation.userId,
    [INVESTOR_RESERVED_AT_KEY]: reservation.createdAt.toISOString(),
  };
  await tx.property.update({
    where: { id: propertyId },
    data: {
      status: "RESERVED",
      metadata: nextMeta as Prisma.InputJsonValue,
    },
  });
}

/**
 * Reconciles `Property` after an investor `Reservation` status change (payment webhook, etc.).
 * Without an active investor reservation, inventory returns to `AVAILABLE` and legacy broker hold keys are cleared.
 */
export async function reconcilePropertyAfterInvestorReservationChange(
  propertyId: string,
  db: Pick<typeof prisma, "property" | "reservation"> = prisma
): Promise<void> {
  const prop = await db.property.findUnique({ where: { id: propertyId } });
  if (!prop) return;
  if (prop.status !== "RESERVED" && prop.status !== "AVAILABLE") {
    return;
  }

  const active = await db.reservation.findFirst({
    where: {
      propertyId,
      status: { in: [...INVESTOR_ACTIVE_RESERVATION_STATUSES] },
    },
    orderBy: { createdAt: "desc" },
  });

  const meta = asMetadataObject(prop.metadata);

  if (active) {
    const nextMeta: Record<string, unknown> = {
      ...stripBrokerReservationMeta(meta),
      [INVESTOR_RESERVATION_ID_KEY]: active.id,
      [INVESTOR_RESERVED_BY_USER_ID_KEY]: active.userId,
      [INVESTOR_RESERVED_AT_KEY]: active.createdAt.toISOString(),
    };
    await db.property.update({
      where: { id: propertyId },
      data: {
        status: "RESERVED",
        metadata: nextMeta as Prisma.InputJsonValue,
      },
    });
    return;
  }

  await db.property.update({
    where: { id: propertyId },
    data: {
      status: "AVAILABLE",
      metadata: stripAllReservationHoldMeta(meta) as Prisma.InputJsonValue,
    },
  });
}

export async function findPropertyByInventoryCode(inventoryCode: string) {
  const code = inventoryCode.trim();
  if (!code) return null;
  return prisma.property.findUnique({
    where: { inventoryCode: code },
  });
}

export async function createProperty(data: {
  title: string;
  status?: "AVAILABLE" | "RESERVED" | "SOLD" | "ARCHIVED";
  visibleToBrokers?: boolean;
  metadata?: unknown;
  inventoryCode?: string | null;
}) {
  const code =
    data.inventoryCode === undefined || data.inventoryCode === null
      ? undefined
      : data.inventoryCode.trim() || null;

  return prisma.property.create({
    data: {
      title: data.title,
      status: data.status ?? "AVAILABLE",
      visibleToBrokers: data.visibleToBrokers ?? false,
      inventoryCode: code ?? undefined,
      metadata:
        data.metadata === undefined || data.metadata === null
          ? undefined
          : (data.metadata as Prisma.InputJsonValue),
    },
  });
}

export async function updateProperty(
  id: string,
  data: {
    title?: string;
    status?: "AVAILABLE" | "RESERVED" | "SOLD" | "ARCHIVED";
    visibleToBrokers?: boolean;
    metadata?: unknown;
    inventoryCode?: string | null;
  }
) {
  const payload: Prisma.PropertyUpdateInput = {};
  if (data.title !== undefined) payload.title = data.title;
  if (data.status !== undefined) payload.status = data.status;
  if (data.visibleToBrokers !== undefined) {
    payload.visibleToBrokers = data.visibleToBrokers;
  }
  if (data.inventoryCode !== undefined) {
    const c = data.inventoryCode;
    payload.inventoryCode = c === null || c.trim() === "" ? null : c.trim();
  }

  if (data.status === "AVAILABLE") {
    const row = await prisma.property.findUnique({
      where: { id },
      select: { metadata: true },
    });
    const existing = asMetadataObject(row?.metadata);
    const patch = data.metadata !== undefined ? asMetadataObject(data.metadata) : {};
    const merged = stripAllReservationHoldMeta({ ...existing, ...patch });
    payload.metadata = merged as Prisma.InputJsonValue;
  } else if (data.metadata !== undefined) {
    payload.metadata =
      data.metadata === null
        ? Prisma.JsonNull
        : (data.metadata as Prisma.InputJsonValue);
  }

  return prisma.property.update({
    where: { id },
    data: payload,
  });
}

/**
 * Upsert by business `inventoryCode` (CSV / import source of truth).
 * Does not remove `houmPropertyId` on update unless a new non-empty value is provided.
 */
export async function upsertPropertyByInventoryCode(data: {
  inventoryCode: string;
  title: string;
  status?: "AVAILABLE" | "RESERVED" | "SOLD" | "ARCHIVED";
  visibleToBrokers?: boolean;
  metadata?: unknown;
  houmPropertyId?: string | null;
}) {
  const inventoryCode = data.inventoryCode.trim();
  if (!inventoryCode) {
    throw new Error("inventoryCode is required");
  }

  const jsonMeta =
    data.metadata === undefined || data.metadata === null
      ? undefined
      : (data.metadata as Prisma.InputJsonValue);

  const existing = await prisma.property.findUnique({
    where: { inventoryCode },
  });

  const houm =
    data.houmPropertyId === undefined
      ? undefined
      : data.houmPropertyId === null || data.houmPropertyId.trim() === ""
        ? null
        : data.houmPropertyId.trim();

  if (existing) {
    const updateData: Prisma.PropertyUpdateInput = {
      title: data.title,
      status: data.status ?? undefined,
      visibleToBrokers: data.visibleToBrokers ?? undefined,
      metadata: jsonMeta === undefined ? undefined : jsonMeta,
    };
    if (houm !== undefined) {
      if (houm !== null) {
        const other = await prisma.property.findFirst({
          where: { houmPropertyId: houm, NOT: { id: existing.id } },
        });
        if (other) {
          throw new Error(`houmPropertyId already used by property ${other.id}`);
        }
      }
      updateData.houmPropertyId = houm;
    }
    return prisma.property.update({
      where: { id: existing.id },
      data: updateData,
    });
  }

  if (houm != null) {
    const other = await prisma.property.findUnique({ where: { houmPropertyId: houm } });
    if (other) {
      throw new Error(`houmPropertyId already used by property ${other.id}`);
    }
  }

  return prisma.property.create({
    data: {
      inventoryCode,
      title: data.title,
      status: data.status ?? "AVAILABLE",
      visibleToBrokers: data.visibleToBrokers ?? false,
      metadata: jsonMeta,
      houmPropertyId: houm ?? undefined,
    },
  });
}

export async function deleteProperty(id: string) {
  return prisma.property.delete({ where: { id } });
}

/**
 * Result of one Houm M2M ingest: either updates the official `Property` row (when it already
 * exists for this Houm id) or upserts a `PropertyCatalogDraft` pending staff approval.
 */
export type HoumIngestOutcome =
  | { kind: "property"; action: "updated" }
  | { kind: "draft"; action: "created" | "updated" };

/**
 * Houm sync ingest: published properties are updated in place; new Houm ids go to the draft queue.
 *
 * @see PropertyCatalogDraft — staging until approve
 */
export async function syncHoumIngestOneRow(args: {
  houmPropertyId: string;
  title: string;
  metadata: unknown;
}): Promise<HoumIngestOutcome> {
  const existingProperty = await prisma.property.findUnique({
    where: { houmPropertyId: args.houmPropertyId },
  });

  const jsonMeta =
    args.metadata === undefined || args.metadata === null
      ? undefined
      : (args.metadata as Prisma.InputJsonValue);

  if (existingProperty) {
    const mergedJson = mergeHoumMetadataIntoProperty(existingProperty.metadata, args.metadata);
    await prisma.property.update({
      where: { id: existingProperty.id },
      data: {
        title: args.title,
        metadata: mergedJson,
      },
    });
    return { kind: "property", action: "updated" };
  }

  const existedDraft = await prisma.propertyCatalogDraft.findUnique({
    where: { houmPropertyId: args.houmPropertyId },
  });

  await prisma.propertyCatalogDraft.upsert({
    where: { houmPropertyId: args.houmPropertyId },
    create: {
      source: "HOUM",
      houmPropertyId: args.houmPropertyId,
      title: args.title,
      ...(jsonMeta !== undefined ? { metadata: jsonMeta } : {}),
      status: "PENDING",
    },
    update: {
      source: "HOUM",
      title: args.title,
      ...(jsonMeta !== undefined ? { metadata: jsonMeta } : {}),
      status: "PENDING",
      rejectionReason: null,
      reviewedAt: null,
      reviewedByUserId: null,
      propertyId: null,
      inventoryCode: null,
      pendingPropertyStatus: null,
      pendingVisibleToBrokers: null,
    },
  });

  return { kind: "draft", action: existedDraft ? "updated" : "created" };
}

export async function listPropertyCatalogDraftsByStatus(
  status: "PENDING" | "REJECTED" | "APPROVED" = "PENDING"
): Promise<PropertyCatalogDraft[]> {
  return prisma.propertyCatalogDraft.findMany({
    where: { status },
    orderBy: { updatedAt: "desc" },
  });
}

/**
 * Stages a new inventory row from CSV until staff approves (same lifecycle as Houm drafts).
 */
export async function upsertCsvPropertyCatalogDraft(data: {
  inventoryCode: string;
  title: string;
  metadata?: unknown;
  houmPropertyId?: string | null;
  pendingPropertyStatus: "AVAILABLE" | "RESERVED" | "SOLD" | "ARCHIVED";
  pendingVisibleToBrokers: boolean;
}): Promise<void> {
  const inventoryCode = data.inventoryCode.trim();
  if (!inventoryCode) {
    throw new Error("inventoryCode is required");
  }

  const houm =
    data.houmPropertyId === undefined || data.houmPropertyId === null || data.houmPropertyId === ""
      ? null
      : data.houmPropertyId.trim();

  if (houm) {
    const propOther = await prisma.property.findUnique({ where: { houmPropertyId: houm } });
    if (propOther) {
      throw new Error(`houmPropertyId already used by property ${propOther.id}`);
    }
    const draftClash = await prisma.propertyCatalogDraft.findFirst({
      where: {
        houmPropertyId: houm,
        status: "PENDING",
        OR: [{ source: "HOUM" }, { source: "CSV", NOT: { inventoryCode } }],
      },
    });
    if (draftClash) {
      throw new Error(`houmPropertyId already used by another pending draft (${draftClash.id})`);
    }
  }

  const jsonMeta =
    data.metadata === undefined || data.metadata === null
      ? undefined
      : (data.metadata as Prisma.InputJsonValue);

  await prisma.propertyCatalogDraft.upsert({
    where: { inventoryCode },
    create: {
      source: "CSV",
      inventoryCode,
      title: data.title.trim(),
      ...(jsonMeta !== undefined ? { metadata: jsonMeta } : {}),
      ...(houm ? { houmPropertyId: houm } : {}),
      status: "PENDING",
      pendingPropertyStatus: data.pendingPropertyStatus,
      pendingVisibleToBrokers: data.pendingVisibleToBrokers,
    },
    update: {
      source: "CSV",
      title: data.title.trim(),
      ...(jsonMeta !== undefined ? { metadata: jsonMeta } : {}),
      houmPropertyId: houm,
      status: "PENDING",
      pendingPropertyStatus: data.pendingPropertyStatus,
      pendingVisibleToBrokers: data.pendingVisibleToBrokers,
      rejectionReason: null,
      reviewedAt: null,
      reviewedByUserId: null,
      propertyId: null,
    },
  });
}

/**
 * Promotes a pending catalog draft to an official `Property` and marks the draft approved.
 */
export async function approvePropertyCatalogDraft(
  draftId: string,
  staffUserId: string
): Promise<{ property: Property; draft: PropertyCatalogDraft }> {
  const draft = await prisma.propertyCatalogDraft.findFirst({
    where: { id: draftId, status: "PENDING" },
  });
  if (!draft) {
    throw new Error("Borrador no encontrado o ya no está pendiente");
  }

  const meta =
    draft.metadata === undefined || draft.metadata === null
      ? Prisma.JsonNull
      : (draft.metadata as Prisma.InputJsonValue);

  if (draft.source === "HOUM") {
    const houmId = draft.houmPropertyId;
    if (!houmId) {
      throw new Error("Borrador Houm inválido: falta houmPropertyId");
    }
    const conflict = await prisma.property.findUnique({
      where: { houmPropertyId: houmId },
    });
    if (conflict) {
      throw new Error(
        "Ya existe una propiedad oficial con este id Houm; no se puede aprobar el borrador."
      );
    }

    return prisma.$transaction(async (tx) => {
      const property = await tx.property.create({
        data: {
          title: draft.title,
          houmPropertyId: houmId,
          status: "AVAILABLE",
          visibleToBrokers: defaultVisibleToBrokersFromEnv(),
          metadata: meta,
        },
      });
      const updatedDraft = await tx.propertyCatalogDraft.update({
        where: { id: draft.id },
        data: {
          status: "APPROVED",
          propertyId: property.id,
          reviewedAt: new Date(),
          reviewedByUserId: staffUserId,
          rejectionReason: null,
        },
      });
      return { property, draft: updatedDraft };
    });
  }

  const code = draft.inventoryCode?.trim();
  if (!code) {
    throw new Error("Borrador CSV inválido: falta inventoryCode");
  }

  const invConflict = await prisma.property.findUnique({
    where: { inventoryCode: code },
  });
  if (invConflict) {
    throw new Error(
      "Ya existe una propiedad oficial con este inventory_code; no se puede aprobar el borrador."
    );
  }

  const houmForCreate = draft.houmPropertyId?.trim() || null;
  if (houmForCreate) {
    const houmConflict = await prisma.property.findUnique({
      where: { houmPropertyId: houmForCreate },
    });
    if (houmConflict) {
      throw new Error(
        "Ya existe una propiedad oficial con este id Houm; no se puede aprobar el borrador."
      );
    }
  }

  const status = draft.pendingPropertyStatus ?? "AVAILABLE";
  const visible = draft.pendingVisibleToBrokers ?? false;

  return prisma.$transaction(async (tx) => {
    const property = await tx.property.create({
      data: {
        title: draft.title,
        inventoryCode: code,
        status,
        visibleToBrokers: visible,
        metadata: meta,
        ...(houmForCreate ? { houmPropertyId: houmForCreate } : {}),
      },
    });
    const updatedDraft = await tx.propertyCatalogDraft.update({
      where: { id: draft.id },
      data: {
        status: "APPROVED",
        propertyId: property.id,
        reviewedAt: new Date(),
        reviewedByUserId: staffUserId,
        rejectionReason: null,
      },
    });
    return { property, draft: updatedDraft };
  });
}

/**
 * Staff rejects a pending catalog draft (row stays for audit; next sync/import can reopen as PENDING).
 */
export async function rejectPropertyCatalogDraft(
  draftId: string,
  staffUserId: string,
  rejectionReason?: string | null
): Promise<PropertyCatalogDraft> {
  const draft = await prisma.propertyCatalogDraft.findFirst({
    where: { id: draftId, status: "PENDING" },
  });
  if (!draft) {
    throw new Error("Borrador no encontrado o ya no está pendiente");
  }

  return prisma.propertyCatalogDraft.update({
    where: { id: draft.id },
    data: {
      status: "REJECTED",
      reviewedAt: new Date(),
      reviewedByUserId: staffUserId,
      rejectionReason: rejectionReason?.trim() || null,
    },
  });
}
