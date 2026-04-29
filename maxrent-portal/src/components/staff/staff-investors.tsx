"use client";

/**
 * Staff table: all portal investors (`canInvest`). Muestra resumen de la última
 * evaluación Floid (sin scoring); el drawer abre detalle completo (FloidReportDetail)
 * + notas internas editables + habilitación / revocación de reservas.
 *
 * @domain maxrent-portal
 * @see GET /api/staff/investors
 * @see GET /api/staff/investors/:id
 * @see POST /api/staff/credit-evaluations/:id/approve-reservation
 * @see POST /api/staff/credit-evaluations/:id/revoke-reservation-approval
 * @see PATCH /api/staff/credit-evaluations/:id/notes
 */

import { useCallback, useEffect, useState } from "react";
import { FloidReportSummary } from "@/components/floid/floid-report-summary";
import { FloidReportDetail } from "@/components/floid/floid-report-detail";

type InvestorEvaluation = {
  id: string;
  status: string;
  requestedAt: string;
  completedAt: string | null;
  staffReservationApprovedAt: string | null;
};

type SponsorSummary = { id: string; email: string; name: string | null } | null;

type InvestorRow = {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  evaluation: InvestorEvaluation | null;
  sponsorBroker: SponsorSummary;
};

type InvestorDetailEvaluation = {
  id: string;
  status: string;
  summary: string | null;
  downloadPdfUrl: string | null;
  rawResponse: unknown;
  errorMessage: string | null;
  requestedAt: string;
  completedAt: string | null;
  consentAt: string | null;
  consentVersion: string | null;
  floidCaseId: string | null;
  staffNotes: string | null;
  staffReservationApprovedAt: string | null;
  staffReservationApprovedByUserId: string | null;
};

type InvestorDetailProfile = {
  firstName: string | null;
  lastName: string | null;
  contactEmail: string | null;
  rut: string | null;
  phone: string | null;
  address: string | null;
  commune: string | null;
  city: string | null;
  onboardingCompleted: boolean;
  additionalData: unknown;
  createdAt: string;
  updatedAt: string;
};

type InvestorDetail = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  emailVerified: string | null;
  canInvest: boolean;
  brokerAccessStatus: string | null;
  brokerReviewedAt: string | null;
  sponsorBrokerUserId: string | null;
  sponsorBrokerAssignedAt: string | null;
  sponsorBroker: {
    id: string;
    email: string;
    name: string | null;
    brokerAccessStatus: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
  profile: InvestorDetailProfile | null;
  creditEvaluations: InvestorDetailEvaluation[];
};

type StaffBrokerOption = {
  id: string;
  email: string;
  name: string | null;
  brokerAccessStatus: string | null;
};

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-CL");
  } catch {
    return iso;
  }
}

export function StaffInvestors() {
  const [items, setItems] = useState<InvestorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyEvaluationId, setBusyEvaluationId] = useState<string | null>(null);
  /** Open confirmation before revoking staff reservation gate */
  const [revokeEvaluationId, setRevokeEvaluationId] = useState<string | null>(null);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  /** Bumps after list mutations so the open drawer refetches detail for the same user. */
  const [detailFetchNonce, setDetailFetchNonce] = useState(0);
  const [detail, setDetail] = useState<InvestorDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [brokers, setBrokers] = useState<StaffBrokerOption[]>([]);
  const [brokersLoading, setBrokersLoading] = useState(false);
  const [sponsorDraft, setSponsorDraft] = useState<string>("");
  const [sponsorSaving, setSponsorSaving] = useState(false);
  const [sponsorMessage, setSponsorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/staff/investors");
      const text = await res.text();
      let data: { investors?: InvestorRow[]; error?: unknown };
      try {
        data = text.trim() ? (JSON.parse(text) as typeof data) : {};
      } catch {
        setError(
          !res.ok && res.status >= 500
            ? "El servidor respondió sin JSON válido. Revisá la consola del servidor o ejecutá migraciones Prisma."
            : "Respuesta inválida del servidor."
        );
        return;
      }
      if (!res.ok) {
        const msg =
          typeof data.error === "string" && data.error.trim()
            ? data.error
            : "No se pudo cargar la lista";
        setError(msg);
        return;
      }
      setItems(data.investors || []);
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selectedUserId) {
      setDetail(null);
      setDetailError(null);
      setDetailLoading(false);
      setBrokers([]);
      setSponsorDraft("");
      setSponsorMessage(null);
      return;
    }

    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);
    setSponsorMessage(null);
    setBrokersLoading(true);

    void (async () => {
      try {
        const [invRes, brRes] = await Promise.all([
          fetch(`/api/staff/investors/${selectedUserId}`),
          fetch("/api/staff/brokers"),
        ]);
        const invData = await invRes.json().catch(() => ({}));
        const brData = await brRes.json().catch(() => ({}));
        if (cancelled) return;
        if (!invRes.ok) {
          setDetailError(invData.error || "No se pudo cargar la ficha");
          return;
        }
        const inv = invData.investor as InvestorDetail;
        setDetail(inv);
        setSponsorDraft(inv.sponsorBrokerUserId ?? "");
        if (brRes.ok && Array.isArray(brData.brokers)) {
          setBrokers(brData.brokers as StaffBrokerOption[]);
        } else {
          setBrokers([]);
        }
      } catch {
        if (!cancelled) setDetailError("Error de red");
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
          setBrokersLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedUserId, detailFetchNonce]);

  useEffect(() => {
    if (!selectedUserId || revokeEvaluationId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedUserId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedUserId, revokeEvaluationId]);

  async function enableReservations(evaluationId: string) {
    setError(null);
    setBusyEvaluationId(evaluationId);
    try {
      const res = await fetch(`/api/staff/credit-evaluations/${evaluationId}/approve-reservation`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo habilitar");
        return;
      }
      await load();
      if (selectedUserId) setDetailFetchNonce((n) => n + 1);
    } catch {
      setError("Error de red");
    } finally {
      setBusyEvaluationId(null);
    }
  }

  async function saveSponsorBroker() {
    if (!selectedUserId) return;
    setSponsorMessage(null);
    setSponsorSaving(true);
    try {
      const sponsorBrokerUserId = sponsorDraft.trim() === "" ? null : sponsorDraft.trim();
      const res = await fetch(`/api/staff/investors/${selectedUserId}/sponsor-broker`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sponsorBrokerUserId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSponsorMessage(typeof data.error === "string" ? data.error : "No se pudo guardar");
        return;
      }
      setSponsorMessage("Broker asignado actualizado.");
      await load();
      setDetailFetchNonce((n) => n + 1);
    } catch {
      setSponsorMessage("Error de red");
    } finally {
      setSponsorSaving(false);
    }
  }

  async function revokeReservationsConfirmed(evaluationId: string) {
    setError(null);
    setBusyEvaluationId(evaluationId);
    try {
      const res = await fetch(
        `/api/staff/credit-evaluations/${evaluationId}/revoke-reservation-approval`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo revocar");
        return;
      }
      setRevokeEvaluationId(null);
      await load();
      if (selectedUserId) setDetailFetchNonce((n) => n + 1);
    } catch {
      setError("Error de red");
    } finally {
      setBusyEvaluationId(null);
    }
  }

  // evalStatusBadge se movió a top-level del módulo (ver al final del archivo)
  // para poder reusarse desde EvaluationStaffCard.

  const canEnable = (ev: InvestorEvaluation | null) =>
    Boolean(ev && ev.status === "COMPLETED" && !ev.staffReservationApprovedAt);

  const canRevoke = (ev: InvestorEvaluation | null) =>
    Boolean(ev && ev.status === "COMPLETED" && ev.staffReservationApprovedAt);

  const revokeBusy = Boolean(revokeEvaluationId && busyEvaluationId === revokeEvaluationId);

  function handleTableRowClick(row: InvestorRow, e: React.MouseEvent<HTMLTableRowElement>) {
    const t = e.target as HTMLElement;
    if (t.closest("[data-stop-row-click]")) return;
    setSelectedUserId(row.id);
  }

  function openRevokeModal(evaluationId: string) {
    setSelectedUserId(null);
    setRevokeEvaluationId(evaluationId);
  }

  const drawerOpen = Boolean(selectedUserId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-serif tracking-tight">Inversionistas</h1>
        <p className="mt-1 text-sm text-gray-600 max-w-2xl">
          La columna <strong>Evaluación Floid</strong> muestra el estado devuelto por el proveedor
          (por ejemplo <strong>COMPLETED</strong> cuando ya hay resultado crediticio). La columna{" "}
          <strong>Habilitación staff para reservar</strong> es independiente: indica si el equipo ya
          autorizó al inversionista a usar «Reservar» en oportunidades. Podés{" "}
          <strong>Habilitar reservas</strong> cuando Floid está completo y aún falta ese paso, o{" "}
          <strong>Revocar habilitación</strong> para volver atrás (no cancela reservas ya hechas).
          Hacé clic en una fila o en <strong>Ver ficha</strong> para ver el detalle completo.
        </p>
      </div>
      {error ? (
        <p className="text-sm text-red-600 rounded-lg border border-red-200 bg-red-50 px-3 py-2" role="alert">
          {error}
        </p>
      ) : null}

      {revokeEvaluationId ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="revoke-dialog-title"
          aria-describedby="revoke-dialog-desc"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/40 cursor-default"
            aria-label="Cerrar diálogo"
            disabled={revokeBusy}
            onClick={() => {
              if (!revokeBusy) setRevokeEvaluationId(null);
            }}
          />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
            <h2 id="revoke-dialog-title" className="text-lg font-semibold text-gray-900">
              Revocar habilitación
            </h2>
            <p id="revoke-dialog-desc" className="mt-2 text-sm text-gray-600">
              El inversionista dejará de poder iniciar <strong>nuevas</strong> reservas en el
              catálogo hasta que vuelvas a habilitar. Las reservas ya creadas no se modifican.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={revokeBusy}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                onClick={() => setRevokeEvaluationId(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={revokeBusy}
                className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-800 disabled:opacity-50"
                onClick={() => void revokeReservationsConfirmed(revokeEvaluationId)}
              >
                {revokeBusy ? "Procesando…" : "Revocar habilitación"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {drawerOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/30"
            aria-label="Cerrar panel de ficha"
            onClick={() => setSelectedUserId(null)}
          />
          <aside
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-gray-200 bg-white shadow-xl"
            aria-labelledby="investor-drawer-title"
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <h2 id="investor-drawer-title" className="text-lg font-semibold text-gray-900">
                Ficha inversionista
              </h2>
              <button
                type="button"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
                onClick={() => setSelectedUserId(null)}
              >
                Cerrar
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 text-sm">
              {detailLoading ? (
                <p className="text-gray-500">Cargando ficha…</p>
              ) : detailError ? (
                <p className="text-red-600" role="alert">
                  {detailError}
                </p>
              ) : detail ? (
                <div className="space-y-6">
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Cuenta
                    </h3>
                    <dl className="mt-2 space-y-1 text-gray-800">
                      <div>
                        <dt className="text-xs text-gray-500">Email</dt>
                        <dd>{detail.email}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-500">Nombre (NextAuth)</dt>
                        <dd>{detail.name?.trim() || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-500">Puede invertir</dt>
                        <dd>{detail.canInvest ? "Sí" : "No"}</dd>
                      </div>
                      <div className="pt-3 border-t border-gray-100 mt-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Broker patrocinador
                        </h4>
                        <p className="mt-1 text-xs text-gray-500">
                          Inversionista derivado de un broker aprobado. Solo cuentas con{" "}
                          <strong>canInvest</strong>.
                        </p>
                        {detail.sponsorBroker ? (
                          <p className="mt-2 text-xs text-gray-700">
                            Actual:{" "}
                            <strong>{detail.sponsorBroker.name?.trim() || detail.sponsorBroker.email}</strong> (
                            {detail.sponsorBroker.email})
                            {detail.sponsorBrokerAssignedAt ? (
                              <span className="block text-gray-500 mt-0.5">
                                Desde {formatDateTime(detail.sponsorBrokerAssignedAt)}
                              </span>
                            ) : null}
                          </p>
                        ) : (
                          <p className="mt-2 text-xs text-gray-500">Sin broker asignado.</p>
                        )}
                        {brokersLoading ? (
                          <p className="mt-2 text-xs text-gray-500">Cargando brokers…</p>
                        ) : (
                          <div className="mt-3 space-y-2">
                            <label className="block text-xs font-medium text-gray-700" htmlFor="sponsor-broker-select">
                              Asignar / cambiar broker
                            </label>
                            <select
                              id="sponsor-broker-select"
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
                              value={sponsorDraft}
                              onChange={(e) => setSponsorDraft(e.target.value)}
                              disabled={!detail.canInvest || sponsorSaving}
                            >
                              <option value="">— Sin broker —</option>
                              {brokers
                                .filter(
                                  (b) =>
                                    b.brokerAccessStatus === "APPROVED" && b.id !== selectedUserId
                                )
                                .map((b) => (
                                  <option key={b.id} value={b.id}>
                                    {b.name?.trim() || b.email} ({b.email})
                                  </option>
                                ))}
                            </select>
                            <button
                              type="button"
                              disabled={!detail.canInvest || sponsorSaving}
                              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
                              onClick={() => void saveSponsorBroker()}
                            >
                              {sponsorSaving ? "Guardando…" : "Guardar asignación"}
                            </button>
                            {sponsorMessage ? (
                              <p
                                className={`text-xs ${sponsorMessage.includes("Error") || sponsorMessage.includes("No se") ? "text-red-600" : "text-green-800"}`}
                              >
                                {sponsorMessage}
                              </p>
                            ) : null}
                          </div>
                        )}
                      </div>
                      {detail.brokerAccessStatus ? (
                        <div>
                          <dt className="text-xs text-gray-500">Estado broker</dt>
                          <dd>{detail.brokerAccessStatus}</dd>
                        </div>
                      ) : null}
                      {detail.brokerReviewedAt ? (
                        <div>
                          <dt className="text-xs text-gray-500">Broker revisado</dt>
                          <dd>{formatDateTime(detail.brokerReviewedAt)}</dd>
                        </div>
                      ) : null}
                      <div>
                        <dt className="text-xs text-gray-500">Email verificado</dt>
                        <dd>{detail.emailVerified ? formatDateTime(detail.emailVerified) : "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-500">Alta / actualización</dt>
                        <dd className="text-xs tabular-nums">
                          {formatDateTime(detail.createdAt)} · {formatDateTime(detail.updatedAt)}
                        </dd>
                      </div>
                    </dl>
                  </section>

                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Perfil
                    </h3>
                    {detail.profile ? (
                      <dl className="mt-2 space-y-1 text-gray-800">
                        <div>
                          <dt className="text-xs text-gray-500">Nombres</dt>
                          <dd>
                            {[detail.profile.firstName, detail.profile.lastName]
                              .filter(Boolean)
                              .join(" ") || "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">RUT</dt>
                          <dd>{detail.profile.rut || "—"}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">Teléfono</dt>
                          <dd>{detail.profile.phone || "—"}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">Comuna / ciudad</dt>
                          <dd>
                            {[detail.profile.commune, detail.profile.city].filter(Boolean).join(" · ") ||
                              "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">Dirección</dt>
                          <dd>{detail.profile.address || "—"}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">Onboarding completado</dt>
                          <dd>{detail.profile.onboardingCompleted ? "Sí" : "No"}</dd>
                        </div>
                        {detail.profile.contactEmail &&
                        detail.profile.contactEmail.toLowerCase() !== detail.email.toLowerCase() ? (
                          <div>
                            <dt className="text-xs text-gray-500">Email de contacto</dt>
                            <dd>{detail.profile.contactEmail}</dd>
                          </div>
                        ) : null}
                      </dl>
                    ) : (
                      <p className="mt-2 text-gray-500">Sin perfil cargado.</p>
                    )}
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Evaluaciones ({detail.creditEvaluations.length})
                    </h3>
                    {detail.creditEvaluations.length === 0 ? (
                      <p className="text-sm text-gray-500">Sin evaluaciones todavía.</p>
                    ) : (
                      detail.creditEvaluations.map((ev) => (
                        <EvaluationStaffCard
                          key={ev.id}
                          ev={ev}
                          busy={busyEvaluationId === ev.id}
                          onEnable={() => void enableReservations(ev.id)}
                          onRevoke={() => openRevokeModal(ev.id)}
                          onSavedNotes={() => setDetailFetchNonce((n) => n + 1)}
                        />
                      ))
                    )}
                  </section>
                </div>
              ) : (
                <p className="text-gray-500">Sin datos.</p>
              )}
            </div>
          </aside>
        </>
      ) : null}

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm ring-1 ring-gray-100">
        {loading ? (
          <p className="p-4 text-sm text-gray-500">Cargando…</p>
        ) : items.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">
            No hay inversionistas con acceso al portal todavía.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse text-sm">
              <colgroup>
                <col className="w-[5.5rem]" />
                <col className="w-[19%]" />
                <col className="w-[14%]" />
                <col className="w-[14%]" />
                <col className="w-[12%]" />
                <col className="w-[10%]" />
                <col className="w-[13%]" />
                <col className="w-[8.5%]" />
              </colgroup>
              <thead>
                <tr className="bg-gray-50/90 text-left text-gray-600 border-b border-gray-100">
                  <th className="px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wide whitespace-normal leading-tight">
                    Ficha
                  </th>
                  <th className="px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wide whitespace-normal leading-tight">
                    Email
                  </th>
                  <th className="px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wide whitespace-normal leading-tight">
                    Nombre
                  </th>
                  <th
                    className="px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wide whitespace-normal leading-tight"
                    title="Broker patrocinador"
                  >
                    Broker
                  </th>
                  <th
                    className="px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wide whitespace-normal leading-tight"
                    title="Evaluación Floid"
                  >
                    Floid
                  </th>
                  <th
                    className="px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wide whitespace-normal leading-tight"
                    title="Completada (Floid)"
                  >
                    Completada
                  </th>
                  <th
                    className="px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wide whitespace-normal leading-tight"
                    title="Habilitación staff para reservar"
                  >
                    Hab. reservas
                  </th>
                  <th className="px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wide whitespace-normal leading-tight">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((row) => {
                  const ev = row.evaluation;
                  const showEnable = canEnable(ev);
                  const showRevoke = canRevoke(ev);
                  const email = row.email;
                  const name = row.name?.trim() || "—";
                  return (
                    <tr
                      key={row.id}
                      className="cursor-pointer hover:bg-gray-50/80"
                      onClick={(e) => handleTableRowClick(row, e)}
                    >
                      <td className="px-2 py-2 align-top">
                        <button
                          type="button"
                          className="text-left text-[11px] font-semibold text-blue-800 hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUserId(row.id);
                          }}
                        >
                          Ver ficha
                        </button>
                      </td>
                      <td
                        className="px-2 py-2 align-top min-w-0 text-gray-900 text-xs truncate"
                        title={email}
                      >
                        {email}
                      </td>
                      <td
                        className="px-2 py-2 align-top min-w-0 text-gray-700 text-xs truncate"
                        title={name !== "—" ? name : undefined}
                      >
                        {name}
                      </td>
                      <td className="px-2 py-2 align-top min-w-0 text-xs text-gray-600 truncate">
                        {row.sponsorBroker ? (
                          <span title={row.sponsorBroker.email}>
                            {row.sponsorBroker.name?.trim() || row.sponsorBroker.email}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-2 py-2 align-top min-w-0">
                        {ev ? evalStatusBadge(ev.status, true) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-2 py-2 align-top text-gray-500 text-[11px] tabular-nums whitespace-normal leading-tight">
                        {ev?.completedAt ? (
                          <>
                            <span className="block">
                              {new Date(ev.completedAt).toLocaleDateString("es-CL")}
                            </span>
                            <span className="block text-gray-400">
                              {new Date(ev.completedAt).toLocaleTimeString("es-CL", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-2 py-2 align-top text-gray-600 text-[11px] whitespace-normal leading-tight break-words">
                        {ev?.staffReservationApprovedAt ? (
                          <span className="text-green-800 font-medium">
                            <span className="block">Sí</span>
                            <span className="block font-normal text-gray-600">
                              {new Date(ev.staffReservationApprovedAt).toLocaleDateString("es-CL")}{" "}
                              {new Date(ev.staffReservationApprovedAt).toLocaleTimeString("es-CL", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </span>
                        ) : ev?.status === "COMPLETED" ? (
                          <span className="text-amber-800 font-medium">Pendiente staff</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td
                        className="px-2 py-2 align-top min-w-0"
                        data-stop-row-click
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex flex-col gap-1 items-stretch">
                          {showEnable && ev ? (
                            <button
                              type="button"
                              disabled={busyEvaluationId === ev.id}
                              className="inline-flex justify-center rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-800 hover:bg-blue-100 transition-colors disabled:opacity-50"
                              onClick={() => void enableReservations(ev.id)}
                            >
                              {busyEvaluationId === ev.id ? "…" : "Habilitar"}
                            </button>
                          ) : null}
                          {showRevoke && ev ? (
                            <button
                              type="button"
                              disabled={busyEvaluationId === ev.id}
                              className="inline-flex justify-center rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-900 hover:bg-red-100 transition-colors disabled:opacity-50"
                              onClick={() => openRevokeModal(ev.id)}
                            >
                              Revocar
                            </button>
                          ) : null}
                          {!showEnable && !showRevoke ? (
                            <span className="text-[11px] text-gray-400">—</span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers compartidos (top-level para usarse en sub-componentes)
// ──────────────────────────────────────────────────────────────────────────────

function evalStatusBadge(status: string, compact?: boolean) {
  const styles: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-900 ring-1 ring-amber-200",
    PROCESSING: "bg-sky-100 text-sky-900 ring-1 ring-sky-200",
    COMPLETED: "bg-green-100 text-green-800 ring-1 ring-green-200",
    FAILED: "bg-red-100 text-red-800 ring-1 ring-red-200",
    EXPIRED: "bg-gray-100 text-gray-700 ring-1 ring-gray-200",
  };
  const cls = styles[status] || "bg-gray-100 text-gray-700 ring-1 ring-gray-200";
  const sizing = compact
    ? "rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-tight"
    : "rounded-full px-2.5 py-0.5 text-xs font-semibold";
  return <span className={`inline-flex items-center ${sizing} ${cls}`}>{status}</span>;
}

// ──────────────────────────────────────────────────────────────────────────────
// Card de evaluación con resumen, detalle expandible, notas y acciones staff
// ──────────────────────────────────────────────────────────────────────────────

function EvaluationStaffCard({
  ev,
  busy,
  onEnable,
  onRevoke,
  onSavedNotes,
}: {
  ev: InvestorDetailEvaluation;
  busy: boolean;
  onEnable: () => void;
  onRevoke: () => void;
  onSavedNotes: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [notesDraft, setNotesDraft] = useState(ev.staffNotes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesMessage, setNotesMessage] = useState<string | null>(null);

  const isCompleted = ev.status === "COMPLETED";
  const isApproved = Boolean(ev.staffReservationApprovedAt);
  const showEnableBtn = isCompleted && !isApproved;
  const showRevokeBtn = isCompleted && isApproved;
  const dirty = (notesDraft || "") !== (ev.staffNotes ?? "");

  async function saveNotes() {
    setSavingNotes(true);
    setNotesMessage(null);
    try {
      const res = await fetch(`/api/staff/credit-evaluations/${ev.id}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesDraft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotesMessage(typeof data.error === "string" ? data.error : "No se pudo guardar");
        return;
      }
      setNotesMessage("Notas guardadas.");
      onSavedNotes();
    } catch {
      setNotesMessage("Error de red");
    } finally {
      setSavingNotes(false);
    }
  }

  return (
    <article className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <header className="px-4 py-3 border-b border-gray-100 flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            {evalStatusBadge(ev.status)}
            <span className="text-gray-500">Solicitada {formatDateTime(ev.requestedAt)}</span>
            {ev.completedAt && (
              <span className="text-gray-500">· Completada {formatDateTime(ev.completedAt)}</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-gray-500">
            <span>ID {ev.id.slice(0, 8)}…</span>
            {ev.floidCaseId && <span>· Floid case {ev.floidCaseId.slice(0, 8)}…</span>}
            {isApproved ? (
              <span className="text-green-800 font-medium">
                · Reservas habilitadas {formatDateTime(ev.staffReservationApprovedAt)}
              </span>
            ) : isCompleted ? (
              <span className="text-amber-800 font-medium">· Pendiente staff</span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {ev.downloadPdfUrl && (
            <a
              href={ev.downloadPdfUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="text-[11px] text-blue-700 hover:underline"
            >
              Descargar PDF (Floid)
            </a>
          )}
          <div className="flex gap-1.5">
            {showEnableBtn && (
              <button
                type="button"
                disabled={busy}
                className="inline-flex justify-center rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-800 hover:bg-blue-100 transition-colors disabled:opacity-50"
                onClick={onEnable}
              >
                {busy ? "…" : "Habilitar reservas"}
              </button>
            )}
            {showRevokeBtn && (
              <button
                type="button"
                disabled={busy}
                className="inline-flex justify-center rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-900 hover:bg-red-100 transition-colors disabled:opacity-50"
                onClick={onRevoke}
              >
                Revocar
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Resumen + ver detalle */}
      <div className="px-4 py-3 space-y-3">
        {ev.errorMessage && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800">
            <span className="font-medium">Error:</span> {ev.errorMessage}
          </div>
        )}

        {ev.rawResponse && Object.keys(ev.rawResponse as object).length > 0 ? (
          <>
            <FloidReportSummary
              rawResponse={ev.rawResponse}
              fallbackSummary={ev.summary}
            />
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-xs font-medium text-blue-700 hover:text-blue-900"
            >
              {expanded ? "Ocultar detalle completo" : "Ver detalle completo"}
            </button>
            {expanded && (
              <div className="rounded-lg border border-gray-200 bg-gray-50/40 p-4">
                <FloidReportDetail
                  rawResponse={ev.rawResponse}
                  downloadPdfUrl={ev.downloadPdfUrl}
                  fallbackSummary={ev.summary}
                  showRawJson
                />
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-gray-500 italic">
            Sin reporte recibido todavía (status {ev.status}).
          </p>
        )}
      </div>

      {/* Notas internas */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/40 space-y-2">
        <label
          htmlFor={`notes-${ev.id}`}
          className="block text-xs font-semibold uppercase tracking-wide text-gray-600"
        >
          Notas internas (no visibles al inversionista)
        </label>
        <textarea
          id={`notes-${ev.id}`}
          rows={3}
          maxLength={5000}
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value)}
          placeholder="Criterio de aprobación, dudas, próximos pasos..."
          className="w-full text-sm rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
        />
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span
            className={`text-[11px] ${
              notesMessage
                ? notesMessage.startsWith("Notas guard")
                  ? "text-green-700"
                  : "text-red-700"
                : "text-gray-400"
            }`}
          >
            {notesMessage || `${notesDraft.length}/5000`}
          </span>
          <div className="flex gap-2">
            {dirty && (
              <button
                type="button"
                onClick={() => {
                  setNotesDraft(ev.staffNotes ?? "");
                  setNotesMessage(null);
                }}
                disabled={savingNotes}
                className="text-xs text-gray-600 hover:text-gray-900 disabled:opacity-50"
              >
                Descartar
              </button>
            )}
            <button
              type="button"
              onClick={() => void saveNotes()}
              disabled={savingNotes || !dirty}
              className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800 transition-colors disabled:opacity-40"
            >
              {savingNotes ? "Guardando…" : "Guardar notas"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
