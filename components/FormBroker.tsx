"use client";

import type { FormEvent, InvalidEvent } from "react";
import { useState } from "react";

import {
  applyWhatsAppChileFormatValidity,
  clearNativeValidity,
  clearWhatsAppValidity,
  nativeInvalidMessageEs,
  spanishWhatsAppInvalid,
} from "@/lib/nativeValidityEs";
import { readStoredAttribution } from "@/lib/marketingAttribution";
import { readReferralCode } from "@/lib/referralCookie";
import { getPortalUrl } from "@/lib/site";

const inputClass =
  "h-11 rounded-lg border-[1.5px] border-[#E2DAD4] bg-white px-3 text-sm text-dark outline-none transition-colors placeholder:text-gray-2 focus:border-orange";

export function FormBroker() {
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    void submitLead(e);
  }

  async function submitLead(e: FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    const wa = form.elements.namedItem("whatsapp");
    if (wa instanceof HTMLInputElement) {
      applyWhatsAppChileFormatValidity(wa);
    }
    if (!form.checkValidity()) {
      e.preventDefault();
      form.reportValidity();
      return;
    }
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    const fd = new FormData(form);
    const email = String(fd.get("email") ?? "").toLowerCase();
    const referralCode = readReferralCode();
    const body = {
      type: "broker" as const,
      nombre: String(fd.get("nombre") ?? ""),
      apellido: String(fd.get("apellido") ?? ""),
      email,
      whatsapp: String(fd.get("whatsapp") ?? ""),
      empresa: String(fd.get("empresa") ?? ""),
      marketing_attribution: readStoredAttribution(),
      // Code de referido leído de la cookie `mxr_ref` (60d, first-touch).
      ...(referralCode ? { referral_code: referralCode } : {}),
    };

    try {
      const res = await fetch(`${getPortalUrl()}/api/public/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setSubmitError(data.error ?? "No pudimos enviar el formulario.");
        return;
      }
      setSubmittedEmail(email);
      setSubmitted(true);
    } catch {
      setSubmitError("Error de conexión. Revisa tu red e intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  function continueToPortal() {
    const portalUrl = new URL(`${getPortalUrl()}/login`);
    portalUrl.searchParams.set("type", "broker");
    portalUrl.searchParams.set("email", submittedEmail);
    portalUrl.searchParams.set("newLead", "1");
    portalUrl.searchParams.set("callbackUrl", "/broker/solicitud");
    window.location.href = portalUrl.toString();
  }

  if (submitted) {
    return (
      <div className="py-4 text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green text-xl text-white">
          ✓
        </div>
        <div className="mb-1.5 font-serif text-xl text-dark">¡Recibimos tu postulación!</div>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-gray-3">
          Te enviamos un email para que entres al portal broker y completes tu perfil comercial.
          Revisamos cada postulación entre 2 y 5 días hábiles.
        </p>
        <button
          type="button"
          onClick={continueToPortal}
          className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-[9px] bg-orange py-3 text-sm font-semibold text-white transition-colors hover:bg-[#E55A00] active:scale-[0.98]"
        >
          Continuar al portal broker <span>→</span>
        </button>
        <button
          type="button"
          className="mt-2 flex w-full cursor-pointer items-center justify-center rounded-[9px] border-[1.5px] border-gray-1 bg-white py-3 text-sm font-semibold text-gray-3 transition-colors hover:bg-cream"
          onClick={() => {
            setSubmitError(null);
            setSubmitted(false);
          }}
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-2 font-serif text-2xl leading-[1.12] tracking-tight text-dark md:text-3xl">
        Postula al
        <br />
        <em className="text-orange not-italic">programa Brokers.</em>
      </div>
      <p className="mb-5 max-w-md border-b border-gray-1 pb-4 text-sm leading-snug text-gray-3">
        Te contactamos en 24 horas. Revisamos cada postulación entre 2 y 5 días hábiles.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="mb-2 grid grid-cols-2 gap-2.5">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-3">Nombre</span>
            <input
              required
              name="nombre"
              onInvalid={(e: InvalidEvent<HTMLInputElement>) => nativeInvalidMessageEs(e, "Nombre")}
              onInput={clearNativeValidity}
              className={inputClass}
              placeholder="Tu nombre"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-3">Apellido</span>
            <input
              required
              name="apellido"
              onInvalid={(e: InvalidEvent<HTMLInputElement>) => nativeInvalidMessageEs(e, "Apellido")}
              onInput={clearNativeValidity}
              className={inputClass}
              placeholder="Tu apellido"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-3">Email</span>
            <input
              required
              type="email"
              name="email"
              onInvalid={(e: InvalidEvent<HTMLInputElement>) => nativeInvalidMessageEs(e, "Email")}
              onInput={clearNativeValidity}
              className={inputClass}
              placeholder="tu@email.com"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-3">WhatsApp</span>
            <input
              required
              type="tel"
              name="whatsapp"
              inputMode="tel"
              autoComplete="tel"
              onInvalid={spanishWhatsAppInvalid}
              onInput={clearWhatsAppValidity}
              className={inputClass}
              placeholder="+56 9 XXXX XXXX"
            />
          </label>
        </div>
        <label className="mb-2 flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-3">Empresa</span>
          <input
            required
            name="empresa"
            onInvalid={(e: InvalidEvent<HTMLInputElement>) =>
              nativeInvalidMessageEs(e, "Empresa")
            }
            onInput={clearNativeValidity}
            className={inputClass}
            placeholder='Nombre de tu corredora o "Independiente"'
          />
        </label>
        {submitError ? (
          <p className="mb-2 text-center text-sm font-medium text-[#c53030]" role="alert">
            {submitError}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={submitting}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-[9px] bg-orange py-3.5 text-base font-semibold text-white transition-colors hover:bg-[#E55A00] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? "Enviando…" : (
            <>
              Postular como broker <span className="transition-transform group-hover:translate-x-1">→</span>
            </>
          )}
        </button>
      </form>
    </>
  );
}
