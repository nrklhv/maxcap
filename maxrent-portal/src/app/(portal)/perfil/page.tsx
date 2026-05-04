// =============================================================================
// Perfil — Datos personales + datos laborales (dos columnas en desktop)
// =============================================================================

"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  emptyLaborForm,
  formatClp,
  laborFormFromStored,
  laborFormToApiPayload,
  type LaborFormState,
} from "@/lib/portal/profile-labor";
import { formatRutForDisplay } from "@/lib/portal/format-rut-display";

type ProfileForm = {
  firstName: string;
  lastName: string;
  contactEmail: string;
  rut: string;
  phone: string;
  address: string;
  commune: string;
  city: string;
};

const emptyForm: ProfileForm = {
  firstName: "",
  lastName: "",
  contactEmail: "",
  rut: "",
  phone: "",
  address: "",
  commune: "",
  city: "",
};

function profileToForm(p: Record<string, unknown> | null | undefined): ProfileForm {
  if (!p) return { ...emptyForm };
  return {
    firstName: (p.firstName as string) || "",
    lastName: (p.lastName as string) || "",
    contactEmail: (p.contactEmail as string) || "",
    rut: (p.rut as string) || "",
    phone: (p.phone as string) || "",
    address: (p.address as string) || "",
    commune: (p.commune as string) || "",
    city: (p.city as string) || "",
  };
}

function formatPhoneForDisplay(e164: string): string {
  const d = e164.replace(/\D/g, "");
  let n = d;
  if (n.startsWith("56")) n = n.slice(2);
  if (n.length !== 9) return e164;
  return `+56 ${n[0]} ${n.slice(1, 5)} ${n.slice(5)}`;
}

type EditSection = "none" | "personal" | "labor" | "both";

function mapZodIssuesToFieldErrors(issues: { path?: unknown[]; message?: string }[]): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const err of issues) {
    const p = err.path ?? [];
    const key =
      p[0] === "labor" && p.length > 1
        ? `labor.${p.slice(1).map(String).join(".")}`
        : typeof p[0] === "string"
          ? String(p[0])
          : "general";
    if (err.message) fieldErrors[key] = err.message;
  }
  return fieldErrors;
}

export default function PerfilPage() {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [baseline, setBaseline] = useState<ProfileForm>(emptyForm);
  const [laborForm, setLaborForm] = useState<LaborFormState>(emptyLaborForm);
  const [laborBaseline, setLaborBaseline] = useState<LaborFormState>(emptyLaborForm);
  const [loginEmail, setLoginEmail] = useState<string | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [editSection, setEditSection] = useState<EditSection>("none");

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users/profile");
      if (!res.ok) return;
      const data = await res.json();
      const next = profileToForm(data.profile);
      setForm(next);
      setBaseline(next);
      const labor = laborFormFromStored(data.profile?.additionalData);
      setLaborForm(labor);
      setLaborBaseline(labor);
      setLoginEmail(data.account?.loginEmail ?? null);
      const done = Boolean(data.profile?.onboardingCompleted);
      setOnboardingCompleted(done);
      setEditSection(done ? "none" : "both");
    } catch {
      setEditSection("both");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setSuccess(false);
  };

  const setLabor = (patch: Partial<LaborFormState>) => {
    setLaborForm((prev) => ({ ...prev, ...patch }));
    setErrors((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        if (k.startsWith("labor.")) delete next[k];
      }
      return next;
    });
    setSuccess(false);
  };

  const startEditingPersonal = () => {
    setBaseline(form);
    setLaborBaseline(laborForm);
    setEditSection("personal");
    setErrors({});
    setSuccess(false);
  };

  const startEditingLabor = () => {
    setBaseline(form);
    setLaborBaseline(laborForm);
    setEditSection("labor");
    setErrors({});
    setSuccess(false);
  };

  const cancelEditing = () => {
    if (editSection === "personal") {
      setForm(baseline);
    } else if (editSection === "labor") {
      setLaborForm(laborBaseline);
    } else if (editSection === "both") {
      setForm(baseline);
      setLaborForm(laborBaseline);
    }
    setErrors({});
    setSuccess(false);
    if (onboardingCompleted) {
      setEditSection("none");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setSuccess(false);

    const laborPayload = laborFormToApiPayload(laborForm);
    const body: Record<string, unknown> = { ...form };
    if (laborPayload !== undefined) {
      body.labor = laborPayload;
    }

    try {
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const rawText = await res.text();
      let data: Record<string, unknown> = {};
      try {
        data = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : {};
      } catch {
        setErrors({
          general:
            "El servidor respondió de forma inesperada (no JSON). Revisa la consola del servidor o intenta de nuevo.",
        });
        return;
      }

      if (!res.ok) {
        const issues = data.errors;
        if (Array.isArray(issues)) {
          const fieldErrors = mapZodIssuesToFieldErrors(
            issues as { path?: unknown[]; message?: string }[]
          );
          if (Object.keys(fieldErrors).length > 0) {
            setErrors(fieldErrors);
          } else {
            setErrors({ general: (data.error as string) || "Error al guardar" });
          }
        } else {
          const base = (data.error as string) || "Error al guardar";
          const hint =
            process.env.NODE_ENV === "development" && typeof data.devHint === "string"
              ? ` (${data.devHint})`
              : "";
          setErrors({ general: `${base}${hint}` });
        }
        return;
      }

      const prof = data.profile as Record<string, unknown> | null;
      const saved = profileToForm(prof);
      setForm(saved);
      setBaseline(saved);
      const laborSaved = laborFormFromStored(prof?.additionalData);
      setLaborForm(laborSaved);
      setLaborBaseline(laborSaved);
      const nowComplete = Boolean(prof?.onboardingCompleted);
      setOnboardingCompleted(nowComplete);
      setEditSection("none");
      setSuccess(true);

      try {
        await updateSession({ onboardingCompleted: nowComplete });
      } catch {
        // session refresh best-effort
      }

      if (nowComplete && !session?.user?.onboardingCompleted) {
        setTimeout(() => router.push("/dashboard"), 1000);
      }
    } catch (err) {
      setErrors({
        general:
          err instanceof Error && /fetch|network/i.test(err.message)
            ? "No pudimos conectar con el servidor. Comprueba tu red o que la app esté en marcha."
            : "Error de conexión",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isView = editSection === "none";
  const showPersonalForm = editSection === "personal" || editSection === "both";
  const showLaborForm = editSection === "labor" || editSection === "both";
  const display = (v: string) => (v.trim() ? v : "—");

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="font-serif text-2xl tracking-tight text-dark">Mi perfil</h1>
        <p className="mt-1 text-gray-600">
          {onboardingCompleted
            ? "Revisá o editá tus datos personales y laborales."
            : "Completá tus datos personales y laborales: ambos bloques son obligatorios para finalizar el perfil y seguir con la evaluación crediticia."}
        </p>
      </div>

      {errors.general ? (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{errors.general}</div>
      ) : null}

      {success ? (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3">
          Datos guardados correctamente.
        </div>
      ) : null}

      {isView ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
          <PersonalReadSection
            form={form}
            display={display}
            formatRutForDisplay={formatRutForDisplay}
            formatPhoneForDisplay={formatPhoneForDisplay}
            withHeading
            onEdit={startEditingPersonal}
          />
          <LaborReadSection laborForm={laborForm} showEditButton onEditLabor={startEditingLabor} />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
            <section className="space-y-3" aria-labelledby="personal-heading-edit">
              <h2
                id="personal-heading-edit"
                className="text-sm font-semibold text-gray-900 uppercase tracking-wide"
              >
                Datos personales
              </h2>
              {showPersonalForm ? (
                <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-5">
                  <FormField
                    label="Nombre"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    placeholder="Juan"
                    error={errors.firstName}
                    required
                  />
                  <FormField
                    label="Apellido"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    placeholder="Pérez"
                    error={errors.lastName}
                    required
                  />
                  <FormField
                    label="Email"
                    name="contactEmail"
                    type="email"
                    value={form.contactEmail}
                    onChange={handleChange}
                    placeholder="correo@ejemplo.cl"
                    error={errors.contactEmail}
                    required
                  />
                  <p className="text-xs text-gray-500 -mt-3">
                    Email de contacto; no modifica el correo con el que iniciás sesión.
                  </p>
                  <FormField
                    label="RUT"
                    name="rut"
                    value={form.rut}
                    onChange={handleChange}
                    placeholder="12.345.678-9"
                    error={errors.rut}
                    required
                  />
                  <FormField
                    label="Teléfono"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+56 9 1234 5678"
                    error={errors.phone}
                    required
                  />
                  <FormField
                    label="Dirección"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="Av. Ejemplo 123"
                    error={errors.address}
                    required
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      label="Comuna"
                      name="commune"
                      value={form.commune}
                      onChange={handleChange}
                      placeholder="Providencia"
                      error={errors.commune}
                      required
                    />
                    <FormField
                      label="Ciudad"
                      name="city"
                      value={form.city}
                      onChange={handleChange}
                      placeholder="Santiago"
                      error={errors.city}
                      required
                    />
                  </div>
                </div>
              ) : (
                <PersonalReadSection
                  form={form}
                  display={display}
                  formatRutForDisplay={formatRutForDisplay}
                  formatPhoneForDisplay={formatPhoneForDisplay}
                  withHeading={false}
                  showEditButton={false}
                  onEdit={startEditingPersonal}
                />
              )}
            </section>

            {showLaborForm ? (
              <LaborEditSection laborForm={laborForm} setLabor={setLabor} errors={errors} />
            ) : (
              <LaborReadSection
                laborForm={laborForm}
                showEditButton={false}
                onEditLabor={startEditingLabor}
              />
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
            {onboardingCompleted ? (
              <button
                type="button"
                onClick={cancelEditing}
                disabled={saving}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
            ) : null}
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Guardar datos"}
            </button>
          </div>
        </form>
      )}

      {loginEmail ? (
        <section
          className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 p-4"
          aria-labelledby="account-heading"
        >
          <h2
            id="account-heading"
            className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2"
          >
            Información de acceso
          </h2>
          <p className="text-sm text-gray-600">
            Sesión iniciada con el correo:{" "}
            <span className="font-medium text-gray-900">{loginEmail}</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Este correo es el de tu cuenta de acceso; no forma parte de los datos personales editables arriba.
          </p>
        </section>
      ) : null}
    </div>
  );
}

function PersonalReadSection({
  form,
  display,
  formatRutForDisplay: fmtRut,
  formatPhoneForDisplay: fmtPhone,
  withHeading = true,
  showEditButton = true,
  onEdit,
}: {
  form: ProfileForm;
  display: (v: string) => string;
  formatRutForDisplay: (r: string) => string;
  formatPhoneForDisplay: (p: string) => string;
  withHeading?: boolean;
  showEditButton?: boolean;
  onEdit: () => void;
}) {
  const card = (
    <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
      <ReadRow label="Nombre" value={display(form.firstName)} />
      <ReadRow label="Apellido" value={display(form.lastName)} />
      <ReadRow label="Email" value={display(form.contactEmail)} />
      <ReadRow label="RUT" value={form.rut ? fmtRut(form.rut) : "—"} />
      <ReadRow label="Teléfono" value={form.phone ? fmtPhone(form.phone) : "—"} />
      <ReadRow label="Dirección" value={display(form.address)} />
      <ReadRow label="Comuna" value={display(form.commune)} />
      <ReadRow label="Ciudad" value={display(form.city)} />
      {showEditButton ? (
        <div className="p-4">
          <button
            type="button"
            onClick={onEdit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Editar datos
          </button>
        </div>
      ) : null}
    </div>
  );

  if (!withHeading) {
    return card;
  }

  return (
    <section className="space-y-3" aria-labelledby="personal-heading">
      <h2
        id="personal-heading"
        className="text-sm font-semibold text-gray-900 uppercase tracking-wide"
      >
        Datos personales
      </h2>
      {card}
    </section>
  );
}

function ReadRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 px-4 py-3">
      <dt className="text-sm text-gray-500 sm:col-span-1">{label}</dt>
      <dd className="text-sm font-medium text-gray-900 sm:col-span-2">{value}</dd>
    </div>
  );
}

function FormField({
  label,
  name,
  value,
  onChange,
  placeholder,
  error,
  required = false,
  type = "text",
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={
          name === "contactEmail"
            ? "email"
            : name === "firstName"
              ? "given-name"
              : name === "lastName"
                ? "family-name"
                : undefined
        }
        className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          error ? "border-red-300 bg-red-50" : "border-gray-300"
        }`}
      />
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function LaborReadSection({
  laborForm,
  showEditButton = true,
  onEditLabor,
  withHeading = true,
}: {
  laborForm: LaborFormState;
  showEditButton?: boolean;
  onEditLabor?: () => void;
  withHeading?: boolean;
}) {
  const has = laborForm.employmentType !== "";
  const editFooter =
    showEditButton && onEditLabor ? (
      <div className="p-4 border-t border-gray-100">
        <button
          type="button"
          onClick={onEditLabor}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          Editar datos
        </button>
      </div>
    ) : null;

  const body = !has ? (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="p-5 text-sm text-gray-500">
        Aún no cargaste datos laborales. Podés completarlos con «Editar datos» abajo.
      </div>
      {editFooter}
    </div>
  ) : (
    <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
      <ReadRow
        label="Situación laboral"
        value={laborForm.employmentType === "DEPENDENT" ? "Dependiente" : "Independiente"}
      />
      {laborForm.employmentType === "DEPENDENT" ? (
        <>
          <ReadRow label="Contrato indefinido" value={laborForm.indefiniteContract ? "Sí" : "No"} />
          <ReadRow label="Antigüedad en el empleo actual" value={laborForm.currentJobTenure || "—"} />
        </>
      ) : (
        <>
          <ReadRow label="Años emitiendo boletas" value={laborForm.independentInvoicesYears || "—"} />
          <ReadRow label="Rubro / actividad" value={laborForm.independentActivity || "—"} />
        </>
      )}
      <ReadRow
        label="Renta líquida mensual"
        value={formatClp(Number(laborForm.monthlyNetIncomeClp.replace(/\D/g, "") || 0))}
      />
      <ReadRow
        label="¿Complementa renta con cotitular?"
        value={laborForm.complementsIncomeWithCotitular ? "Sí" : "No"}
      />
      {laborForm.complementsIncomeWithCotitular ? (
        <ReadRow
          label="Renta mensual cotitular"
          value={formatClp(Number(laborForm.cotitularMonthlyNetIncomeClp.replace(/\D/g, "") || 0))}
        />
      ) : null}
      <ReadRow
        label="Deudas mensuales actuales"
        value={formatClp(Number(laborForm.monthlyDebtPaymentsClp.replace(/\D/g, "") || 0))}
      />
      {editFooter}
    </div>
  );

  if (!withHeading) {
    return body;
  }

  return (
    <section className="space-y-3" aria-labelledby="labor-heading">
      <h2 id="labor-heading" className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
        Datos laborales
      </h2>
      {body}
    </section>
  );
}

function LaborEditSection({
  laborForm,
  setLabor,
  errors,
}: {
  laborForm: LaborFormState;
  setLabor: (p: Partial<LaborFormState>) => void;
  errors: Record<string, string>;
}) {
  const err = (suffix: string) => errors[`labor.${suffix}`];

  return (
    <section className="space-y-3" aria-labelledby="labor-heading-edit">
      <h2 id="labor-heading-edit" className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
        Datos laborales
      </h2>
      <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-5">
        <fieldset>
          <legend className="block text-sm font-medium text-gray-700 mb-2">Situación laboral</legend>
          <div className="flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-gray-800">
              <input
                type="radio"
                name="employmentType"
                value="DEPENDENT"
                checked={laborForm.employmentType === "DEPENDENT"}
                onChange={() => setLabor({ employmentType: "DEPENDENT" })}
                className="text-blue-600"
              />
              Dependiente
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-800">
              <input
                type="radio"
                name="employmentType"
                value="INDEPENDENT"
                checked={laborForm.employmentType === "INDEPENDENT"}
                onChange={() => setLabor({ employmentType: "INDEPENDENT" })}
                className="text-blue-600"
              />
              Independiente
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-500">
              <input
                type="radio"
                name="employmentType"
                value=""
                checked={laborForm.employmentType === ""}
                onChange={() => setLabor({ employmentType: "" })}
                className="text-blue-600"
              />
              No indicar aún
            </label>
          </div>
          {err("employmentType") ? <p className="mt-1 text-xs text-red-600">{err("employmentType")}</p> : null}
        </fieldset>

        {laborForm.employmentType === "DEPENDENT" ? (
          <>
            <fieldset>
              <legend className="block text-sm font-medium text-gray-700 mb-2">¿Contrato indefinido?</legend>
              <div className="flex gap-4">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="indefiniteContract"
                    checked={laborForm.indefiniteContract === true}
                    onChange={() => setLabor({ indefiniteContract: true })}
                  />
                  Sí
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="indefiniteContract"
                    checked={laborForm.indefiniteContract === false}
                    onChange={() => setLabor({ indefiniteContract: false })}
                  />
                  No
                </label>
              </div>
            </fieldset>
            <div>
              <label htmlFor="currentJobTenure" className="block text-sm font-medium text-gray-700 mb-1">
                Antigüedad en el empleo actual <span className="text-red-500">*</span>
              </label>
              <input
                id="currentJobTenure"
                value={laborForm.currentJobTenure}
                onChange={(e) => setLabor({ currentJobTenure: e.target.value })}
                placeholder="Ej.: 2 años"
                className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 ${
                  err("currentJobTenure") ? "border-red-300 bg-red-50" : "border-gray-300"
                }`}
              />
              {err("currentJobTenure") ? (
                <p className="mt-1 text-xs text-red-600">{err("currentJobTenure")}</p>
              ) : null}
            </div>
          </>
        ) : null}

        {laborForm.employmentType === "INDEPENDENT" ? (
          <>
            <div>
              <label htmlFor="independentInvoicesYears" className="block text-sm font-medium text-gray-700 mb-1">
                Años emitiendo boletas <span className="text-red-500">*</span>
              </label>
              <input
                id="independentInvoicesYears"
                inputMode="numeric"
                value={laborForm.independentInvoicesYears}
                onChange={(e) => setLabor({ independentInvoicesYears: e.target.value })}
                placeholder="Ej.: 3"
                className={`w-full px-3 py-2.5 border rounded-lg text-sm ${
                  err("independentInvoicesYears") ? "border-red-300 bg-red-50" : "border-gray-300"
                }`}
              />
              {err("independentInvoicesYears") ? (
                <p className="mt-1 text-xs text-red-600">{err("independentInvoicesYears")}</p>
              ) : null}
            </div>
            <div>
              <label htmlFor="independentActivity" className="block text-sm font-medium text-gray-700 mb-1">
                Rubro / actividad <span className="text-red-500">*</span>
              </label>
              <input
                id="independentActivity"
                value={laborForm.independentActivity}
                onChange={(e) => setLabor({ independentActivity: e.target.value })}
                placeholder="Ej.: servicios informáticos"
                className={`w-full px-3 py-2.5 border rounded-lg text-sm ${
                  err("independentActivity") ? "border-red-300 bg-red-50" : "border-gray-300"
                }`}
              />
              {err("independentActivity") ? (
                <p className="mt-1 text-xs text-red-600">{err("independentActivity")}</p>
              ) : null}
            </div>
          </>
        ) : null}

        {laborForm.employmentType ? (
          <>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">Capacidad de pago</h3>
            <div>
              <label htmlFor="monthlyNetIncomeClp" className="block text-sm font-medium text-gray-700 mb-1">
                Renta líquida mensual (CLP) <span className="text-red-500">*</span>
              </label>
              <input
                id="monthlyNetIncomeClp"
                inputMode="numeric"
                value={laborForm.monthlyNetIncomeClp}
                onChange={(e) => setLabor({ monthlyNetIncomeClp: e.target.value })}
                placeholder="Ej.: 1500000"
                className={`w-full px-3 py-2.5 border rounded-lg text-sm ${
                  err("monthlyNetIncomeClp") ? "border-red-300 bg-red-50" : "border-gray-300"
                }`}
              />
              {err("monthlyNetIncomeClp") ? (
                <p className="mt-1 text-xs text-red-600">{err("monthlyNetIncomeClp")}</p>
              ) : null}
            </div>

            <fieldset>
              <legend className="block text-sm font-medium text-gray-700 mb-2">
                ¿Complementa renta con cotitular?
              </legend>
              <div className="flex gap-4">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="complementsIncomeWithCotitular"
                    checked={laborForm.complementsIncomeWithCotitular === true}
                    onChange={() => setLabor({ complementsIncomeWithCotitular: true })}
                  />
                  Sí
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="complementsIncomeWithCotitular"
                    checked={laborForm.complementsIncomeWithCotitular === false}
                    onChange={() => setLabor({ complementsIncomeWithCotitular: false })}
                  />
                  No
                </label>
              </div>
            </fieldset>

            {laborForm.complementsIncomeWithCotitular ? (
              <div>
                <label
                  htmlFor="cotitularMonthlyNetIncomeClp"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Renta mensual cotitular (CLP) <span className="text-red-500">*</span>
                </label>
                <input
                  id="cotitularMonthlyNetIncomeClp"
                  inputMode="numeric"
                  value={laborForm.cotitularMonthlyNetIncomeClp}
                  onChange={(e) => setLabor({ cotitularMonthlyNetIncomeClp: e.target.value })}
                  placeholder="Ej.: 500000"
                  className={`w-full px-3 py-2.5 border rounded-lg text-sm ${
                    err("cotitularMonthlyNetIncomeClp") ? "border-red-300 bg-red-50" : "border-gray-300"
                  }`}
                />
                {err("cotitularMonthlyNetIncomeClp") ? (
                  <p className="mt-1 text-xs text-red-600">{err("cotitularMonthlyNetIncomeClp")}</p>
                ) : null}
              </div>
            ) : null}

            <div>
              <label htmlFor="monthlyDebtPaymentsClp" className="block text-sm font-medium text-gray-700 mb-1">
                Deudas mensuales actuales (CLP) <span className="text-red-500">*</span>
              </label>
              <input
                id="monthlyDebtPaymentsClp"
                inputMode="numeric"
                value={laborForm.monthlyDebtPaymentsClp}
                onChange={(e) => setLabor({ monthlyDebtPaymentsClp: e.target.value })}
                placeholder="Ej.: 150000"
                className={`w-full px-3 py-2.5 border rounded-lg text-sm ${
                  err("monthlyDebtPaymentsClp") ? "border-red-300 bg-red-50" : "border-gray-300"
                }`}
              />
              {err("monthlyDebtPaymentsClp") ? (
                <p className="mt-1 text-xs text-red-600">{err("monthlyDebtPaymentsClp")}</p>
              ) : null}
            </div>
          </>
        ) : (
          <p className="text-xs text-gray-500">
            Elegí dependiente o independiente para completar capacidad de pago.
          </p>
        )}
      </div>
    </section>
  );
}
