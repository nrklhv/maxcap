"use client";

/**
 * Investor `Profile` on broker `/broker/perfil`: create/update via `PUT /api/users/profile`
 * (same contract as portal `/perfil`). Read view first, then form with Cancel/Save (investor pattern).
 *
 * @domain maxrent-portal / broker
 * @see PUT /api/users/profile
 */

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { BrokerPerfilAccountProps, BrokerPerfilPersonalProfile } from "@/components/broker/broker-perfil-types";
import { formatPhoneForDisplay } from "@/lib/portal/format-phone-display";
import { formatRutForDisplay } from "@/lib/portal/format-rut-display";

function ReadRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 px-4 py-3">
      <dt className="text-sm text-gray-500 sm:col-span-1">{label}</dt>
      <dd className="text-sm font-medium text-gray-900 sm:col-span-2 break-words">{value}</dd>
    </div>
  );
}

function display(v: string | null | undefined) {
  const t = v?.trim();
  return t ? t : "—";
}

function profileToFormState(
  account: BrokerPerfilAccountProps,
  personalProfile: BrokerPerfilPersonalProfile
) {
  return {
    firstName: personalProfile?.firstName?.trim() ?? "",
    lastName: personalProfile?.lastName?.trim() ?? "",
    contactEmail: personalProfile?.contactEmail?.trim() || account.email,
    rut: personalProfile?.rut?.trim() ?? "",
    phone: personalProfile?.phone?.trim() ?? "",
    address: personalProfile?.address?.trim() ?? "",
    commune: personalProfile?.commune?.trim() ?? "",
    city: personalProfile?.city?.trim() ?? "",
  };
}

type FormState = ReturnType<typeof profileToFormState>;

function mapIssuesToFieldErrors(issues: { path?: unknown[]; message?: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const err of issues) {
    const key = typeof err.path?.[0] === "string" ? String(err.path[0]) : "general";
    if (err.message) out[key] = err.message;
  }
  return out;
}

function PersonalReadCard({
  account,
  personalProfile,
  displayName,
  footer,
}: {
  account: BrokerPerfilAccountProps;
  personalProfile: BrokerPerfilPersonalProfile;
  displayName: string;
  footer?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
      {account.image ? (
        <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-100">
          <img
            src={account.image}
            alt=""
            className="h-12 w-12 rounded-full object-cover border border-gray-200"
          />
          <span className="text-xs text-gray-500">Foto de perfil (proveedor de acceso)</span>
        </div>
      ) : null}
      <dl>
        <ReadRow label="Correo de acceso" value={account.email} />
        <ReadRow label="Nombre (sesión)" value={displayName} />
        <ReadRow label="Email de contacto" value={display(personalProfile?.contactEmail)} />
        <ReadRow label="Nombre" value={display(personalProfile?.firstName)} />
        <ReadRow label="Apellido" value={display(personalProfile?.lastName)} />
        <ReadRow label="RUT" value={formatRutForDisplay(personalProfile?.rut)} />
        <ReadRow label="Teléfono" value={formatPhoneForDisplay(personalProfile?.phone ?? null)} />
        <ReadRow label="Dirección" value={display(personalProfile?.address)} />
        <ReadRow label="Comuna" value={display(personalProfile?.commune)} />
        <ReadRow label="Ciudad" value={display(personalProfile?.city)} />
      </dl>
      {footer ? <div className="p-4 border-t border-gray-100">{footer}</div> : null}
    </div>
  );
}

/** Matches `(portal)/perfil` PersonalReadSection edit button. */
const investorEditDatosButtonClass =
  "px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700";

export function BrokerPersonalPanel({
  account,
  personalProfile,
  canInvest,
}: {
  account: BrokerPerfilAccountProps;
  personalProfile: BrokerPerfilPersonalProfile;
  canInvest: boolean;
}) {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const displayName = account.name?.trim() || "—";

  const [form, setForm] = useState<FormState>(() => profileToFormState(account, personalProfile));
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [savedOk, setSavedOk] = useState(false);

  useEffect(() => {
    setForm(profileToFormState(account, personalProfile));
  }, [account, personalProfile]);

  const resetFormFromProps = useCallback(() => {
    setForm(profileToFormState(account, personalProfile));
    setFieldErrors({});
    setError(null);
    setSavedOk(false);
  }, [account, personalProfile]);

  const handleChange = (name: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    setError(null);
    setSavedOk(false);
  };

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      setError(null);
      setFieldErrors({});
      setSavedOk(false);
      try {
        const res = await fetch("/api/users/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: form.firstName,
            lastName: form.lastName,
            contactEmail: form.contactEmail,
            rut: form.rut,
            phone: form.phone,
            address: form.address,
            commune: form.commune,
            city: form.city,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const issues = data.errors;
          if (Array.isArray(issues)) {
            setFieldErrors(mapIssuesToFieldErrors(issues));
            setError(typeof data.error === "string" ? data.error : "Revisá los campos marcados");
          } else {
            setError(typeof data.error === "string" ? data.error : "No se pudo guardar");
          }
          return;
        }
        setSavedOk(true);
        setIsEditingPersonal(false);
        try {
          await updateSession();
        } catch {
          // best-effort session refresh (e.g. User.name)
        }
        router.refresh();
      } catch {
        setError("Error de red");
      } finally {
        setSaving(false);
      }
    },
    [form, router, updateSession]
  );

  const investorPortalLinkClass =
    "font-medium text-broker-accent hover:text-broker-accent-hover hover:underline";

  if (!isEditingPersonal) {
    return (
      <>
        <p className="text-xs text-gray-500">
          Los mismos datos que en el perfil inversionista. Podés crearlos o actualizarlos acá; se guardan en una sola
          ficha para toda tu cuenta.
        </p>
        {canInvest ? (
          <p className="text-xs">
            <Link href="/perfil" className={investorPortalLinkClass}>
              Abrir también en portal inversionista
            </Link>
          </p>
        ) : null}
        {savedOk ? (
          <p className="text-sm text-green-800 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
            Datos personales guardados.
          </p>
        ) : null}
        <PersonalReadCard
          account={account}
          personalProfile={personalProfile}
          displayName={displayName}
          footer={
            <button
              type="button"
              onClick={() => {
                setForm(profileToFormState(account, personalProfile));
                setFieldErrors({});
                setError(null);
                setIsEditingPersonal(true);
              }}
              className={investorEditDatosButtonClass}
            >
              Editar datos
            </button>
          }
        />
      </>
    );
  }

  const fe = (k: keyof FormState) => fieldErrors[k];

  return (
    <>
      <p className="text-xs text-gray-500">
        Los mismos datos que en el perfil inversionista. Podés crearlos o actualizarlos acá; se guardan en una sola
        ficha para toda tu cuenta.
      </p>
      {canInvest ? (
        <p className="text-xs">
          <Link href="/perfil" className={investorPortalLinkClass}>
            Abrir también en portal inversionista
          </Link>
        </p>
      ) : null}
      <form onSubmit={submit} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {account.image ? (
          <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-100 bg-gray-50/50">
            <img
              src={account.image}
              alt=""
              className="h-12 w-12 rounded-full object-cover border border-gray-200"
            />
            <div>
              <p className="text-xs font-medium text-gray-700">Correo de acceso</p>
              <p className="text-sm text-gray-900">{account.email}</p>
              <p className="text-xs text-gray-500 mt-1">Nombre en sesión: {displayName}</p>
            </div>
          </div>
        ) : (
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 text-sm text-gray-800">
            <span className="text-xs text-gray-500">Correo de acceso</span>
            <p className="font-medium">{account.email}</p>
            <p className="text-xs text-gray-500 mt-1">Nombre en sesión: {displayName}</p>
          </div>
        )}
        <div className="p-5 space-y-4">
          {error ? (
            <p className="text-sm text-red-600 rounded-lg border border-red-200 bg-red-50 px-3 py-2" role="alert">
              {error}
            </p>
          ) : null}

          <div>
            <label htmlFor="bp-firstName" className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Nombre
            </label>
            <input
              id="bp-firstName"
              value={form.firstName}
              onChange={(e) => handleChange("firstName", e.target.value)}
              className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm text-gray-900 ${
                fe("firstName") ? "border-red-300 bg-red-50" : "border-gray-200"
              }`}
              autoComplete="given-name"
            />
            {fe("firstName") ? <p className="mt-1 text-xs text-red-600">{fe("firstName")}</p> : null}
          </div>
          <div>
            <label htmlFor="bp-lastName" className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Apellido
            </label>
            <input
              id="bp-lastName"
              value={form.lastName}
              onChange={(e) => handleChange("lastName", e.target.value)}
              className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm text-gray-900 ${
                fe("lastName") ? "border-red-300 bg-red-50" : "border-gray-200"
              }`}
              autoComplete="family-name"
            />
            {fe("lastName") ? <p className="mt-1 text-xs text-red-600">{fe("lastName")}</p> : null}
          </div>
          <div>
            <label htmlFor="bp-contactEmail" className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Email de contacto
            </label>
            <input
              id="bp-contactEmail"
              type="email"
              value={form.contactEmail}
              onChange={(e) => handleChange("contactEmail", e.target.value)}
              className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm text-gray-900 ${
                fe("contactEmail") ? "border-red-300 bg-red-50" : "border-gray-200"
              }`}
              autoComplete="email"
            />
            <p className="mt-1 text-xs text-gray-500">No modifica el correo con el que iniciás sesión.</p>
            {fe("contactEmail") ? <p className="mt-1 text-xs text-red-600">{fe("contactEmail")}</p> : null}
          </div>
          <div>
            <label htmlFor="bp-rut" className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
              RUT
            </label>
            <input
              id="bp-rut"
              value={form.rut}
              onChange={(e) => handleChange("rut", e.target.value)}
              placeholder="12.345.678-9"
              className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm text-gray-900 ${
                fe("rut") ? "border-red-300 bg-red-50" : "border-gray-200"
              }`}
            />
            {fe("rut") ? <p className="mt-1 text-xs text-red-600">{fe("rut")}</p> : null}
          </div>
          <div>
            <label htmlFor="bp-phone" className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Teléfono móvil
            </label>
            <input
              id="bp-phone"
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="+56 9 1234 5678"
              className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm text-gray-900 ${
                fe("phone") ? "border-red-300 bg-red-50" : "border-gray-200"
              }`}
              autoComplete="tel"
            />
            {fe("phone") ? <p className="mt-1 text-xs text-red-600">{fe("phone")}</p> : null}
          </div>
          <div>
            <label htmlFor="bp-address" className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Dirección
            </label>
            <input
              id="bp-address"
              value={form.address}
              onChange={(e) => handleChange("address", e.target.value)}
              className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm text-gray-900 ${
                fe("address") ? "border-red-300 bg-red-50" : "border-gray-200"
              }`}
            />
            {fe("address") ? <p className="mt-1 text-xs text-red-600">{fe("address")}</p> : null}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="bp-commune" className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Comuna
              </label>
              <input
                id="bp-commune"
                value={form.commune}
                onChange={(e) => handleChange("commune", e.target.value)}
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm text-gray-900 ${
                  fe("commune") ? "border-red-300 bg-red-50" : "border-gray-200"
                }`}
              />
              {fe("commune") ? <p className="mt-1 text-xs text-red-600">{fe("commune")}</p> : null}
            </div>
            <div>
              <label htmlFor="bp-city" className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Ciudad
              </label>
              <input
                id="bp-city"
                value={form.city}
                onChange={(e) => handleChange("city", e.target.value)}
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm text-gray-900 ${
                  fe("city") ? "border-red-300 bg-red-50" : "border-gray-200"
                }`}
              />
              {fe("city") ? <p className="mt-1 text-xs text-red-600">{fe("city")}</p> : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                resetFormFromProps();
                setIsEditingPersonal(false);
              }}
              className="inline-flex justify-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex justify-center rounded-lg bg-broker-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-broker-accent-hover disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Guardar datos personales"}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
