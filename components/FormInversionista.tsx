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

type Props = {
  onReserved: () => void;
};

export function FormInversionista({ onReserved }: Props) {
  const [submitted, setSubmitted] = useState(false);
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
    const body = {
      type: "inversionista" as const,
      nombre: String(fd.get("nombre") ?? ""),
      apellido: String(fd.get("apellido") ?? ""),
      email: String(fd.get("email") ?? ""),
      whatsapp: String(fd.get("whatsapp") ?? ""),
      marketing_attribution: readStoredAttribution(),
    };

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setSubmitError(data.error ?? "No pudimos enviar el formulario.");
        return;
      }
      onReserved();
      setSubmitted(true);
    } catch {
      setSubmitError("Error de conexión. Revisa tu red e intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="py-4 text-center">
        <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-green text-lg text-white">
          ✓
        </div>
        <div className="mb-1.5 font-serif text-lg text-dark">¡Recibimos tus datos!</div>
        <p className="mx-auto max-w-[280px] text-[12.5px] leading-relaxed text-gray-3">
          Un especialista de Renta Capital te contactará por WhatsApp en menos de 24 horas. El cupo no queda
          reservado con este paso: depende de la evaluación y del pago de la reserva.
        </p>
        <button
          type="button"
          className="mt-4 flex w-full cursor-pointer items-center justify-center rounded-[9px] border-[1.5px] border-orange bg-white py-2.5 text-[13px] font-semibold text-orange transition-colors hover:bg-orange/5"
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
      <div className="mb-1.5 font-serif text-[22px] leading-[1.12] tracking-tight text-dark md:text-[24px]">
        Inscríbete ahora
        <br />
        y no pierdas
        <br />
        <em className="text-orange not-italic">la oportunidad.</em>
      </div>
      <p className="mb-5 max-w-[320px] border-b border-gray-1 pb-4 text-[12.5px] leading-snug text-gray-3">
        Un especialista de Renta Capital te contacta en menos de 24 horas con las propiedades disponibles para tu
        perfil.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="mb-2 grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-3">Nombre</span>
            <input
              required
              name="nombre"
              onInvalid={(e: InvalidEvent<HTMLInputElement>) => nativeInvalidMessageEs(e, "Nombre")}
              onInput={clearNativeValidity}
              className="h-[38px] rounded-lg border-[1.5px] border-[#E2DAD4] bg-white px-2.5 text-[13px] text-dark outline-none transition-colors placeholder:text-gray-2 focus:border-orange"
              placeholder="Tu nombre"
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-3">Apellido</span>
            <input
              required
              name="apellido"
              onInvalid={(e: InvalidEvent<HTMLInputElement>) => nativeInvalidMessageEs(e, "Apellido")}
              onInput={clearNativeValidity}
              className="h-[38px] rounded-lg border-[1.5px] border-[#E2DAD4] bg-white px-2.5 text-[13px] text-dark outline-none transition-colors placeholder:text-gray-2 focus:border-orange"
              placeholder="Tu apellido"
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-3">Email</span>
            <input
              required
              type="email"
              name="email"
              onInvalid={(e: InvalidEvent<HTMLInputElement>) => nativeInvalidMessageEs(e, "Email")}
              onInput={clearNativeValidity}
              className="h-[38px] rounded-lg border-[1.5px] border-[#E2DAD4] bg-white px-2.5 text-[13px] text-dark outline-none transition-colors placeholder:text-gray-2 focus:border-orange"
              placeholder="tu@email.com"
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-3">WhatsApp</span>
            <input
              required
              type="tel"
              name="whatsapp"
              inputMode="tel"
              autoComplete="tel"
              onInvalid={spanishWhatsAppInvalid}
              onInput={clearWhatsAppValidity}
              className="h-[38px] rounded-lg border-[1.5px] border-[#E2DAD4] bg-white px-2.5 text-[13px] text-dark outline-none transition-colors placeholder:text-gray-2 focus:border-orange"
              placeholder="+56 9 XXXX XXXX"
            />
          </label>
        </div>
        {submitError ? (
          <p className="mb-2 text-center text-[12px] font-medium text-[#c53030]" role="alert">
            {submitError}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={submitting}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-[9px] bg-orange py-3 text-[14px] font-semibold text-white transition-colors hover:bg-[#E55A00] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? "Enviando…" : (
            <>
              Reservar mi cupo <span className="transition-transform group-hover:translate-x-1">→</span>
            </>
          )}
        </button>
        <p className="mt-2 text-center text-[11px] leading-relaxed text-gray-3">
          Sin costo · Sin compromiso · Respuesta en 24 horas
        </p>
      </form>
    </>
  );
}
