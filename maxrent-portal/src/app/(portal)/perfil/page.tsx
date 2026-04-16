// =============================================================================
// Perfil — Datos personales (ver / editar) + acceso a cuenta aparte
// =============================================================================

"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

/** Muestra +56912345678 como +56 9 1234 5678 */
function formatPhoneForDisplay(e164: string): string {
  const d = e164.replace(/\D/g, "");
  let n = d;
  if (n.startsWith("56")) n = n.slice(2);
  if (n.length !== 9) return e164;
  return `+56 ${n[0]} ${n.slice(1, 5)} ${n.slice(5)}`;
}

function formatRutForDisplay(rut: string): string {
  const clean = rut.replace(/\./g, "").replace(/-/g, "");
  if (clean.length < 2) return rut;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  const rev = body.split("").reverse().join("");
  const chunks = rev.match(/.{1,3}/g) ?? [];
  const dotted = chunks.join(".").split("").reverse().join("");
  return `${dotted}-${dv}`;
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
  const [loginEmail, setLoginEmail] = useState<string | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users/profile");
      if (!res.ok) return;
      const data = await res.json();
      const next = profileToForm(data.profile);
      setForm(next);
      setBaseline(next);
      setLoginEmail(data.account?.loginEmail ?? null);
      const done = Boolean(data.profile?.onboardingCompleted);
      setOnboardingCompleted(done);
      setIsEditing(!done);
    } catch {
      // sin perfil aún
      setIsEditing(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setSuccess(false);
  };

  const startEditing = () => {
    setBaseline(form);
    setIsEditing(true);
    setErrors({});
    setSuccess(false);
  };

  const cancelEditing = () => {
    setForm(baseline);
    setErrors({});
    setSuccess(false);
    if (onboardingCompleted) {
      setIsEditing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setSuccess(false);

    try {
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) {
          const fieldErrors: Record<string, string> = {};
          for (const err of data.errors as { path: (string | number)[]; message: string }[]) {
            const key = err.path[0];
            if (typeof key === "string") fieldErrors[key] = err.message;
          }
          setErrors(fieldErrors);
        } else {
          setErrors({ general: data.error || "Error al guardar" });
        }
        return;
      }

      const saved = profileToForm(data.profile);
      setForm(saved);
      setBaseline(saved);
      setOnboardingCompleted(true);
      setIsEditing(false);
      setSuccess(true);

      await updateSession({ onboardingCompleted: true });

      if (!session?.user?.onboardingCompleted) {
        setTimeout(() => router.push("/dashboard"), 1000);
      }
    } catch {
      setErrors({ general: "Error de conexión" });
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

  const showView = !isEditing;
  const display = (v: string) => (v.trim() ? v : "—");

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mi perfil</h1>
        <p className="mt-1 text-gray-600">
          {onboardingCompleted
            ? "Revisa o edita tus datos personales."
            : "Completa tus datos personales para continuar en el portal."}
        </p>
      </div>

      <section className="space-y-3" aria-labelledby="personal-heading">
        <h2 id="personal-heading" className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
          Datos personales
        </h2>

        {errors.general && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
            {errors.general}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3">
            Datos guardados correctamente.
          </div>
        )}

        {showView ? (
          <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
            <ReadRow label="Nombre" value={display(form.firstName)} />
            <ReadRow label="Apellido" value={display(form.lastName)} />
            <ReadRow label="Email" value={display(form.contactEmail)} />
            <ReadRow
              label="RUT"
              value={form.rut ? formatRutForDisplay(form.rut) : "—"}
            />
            <ReadRow
              label="Teléfono"
              value={form.phone ? formatPhoneForDisplay(form.phone) : "—"}
            />
            <ReadRow label="Dirección" value={display(form.address)} />
            <ReadRow label="Comuna" value={display(form.commune)} />
            <ReadRow label="Ciudad" value={display(form.city)} />
            <div className="p-4">
              <button
                type="button"
                onClick={startEditing}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Editar datos
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-gray-200 bg-white p-5">
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
              Email de contacto; no modifica el correo con el que inicias sesión.
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
      </section>

      {loginEmail ? (
        <section className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 p-4" aria-labelledby="account-heading">
          <h2 id="account-heading" className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
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
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
