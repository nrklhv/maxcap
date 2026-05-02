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
import { getPortalUrl } from "@/lib/site";

/** Slightly shorter fields so the vendedor sidebar fits above the fold on typical laptop heights. */
const inputClass =
  "h-10 rounded-lg border-[1.5px] border-[#E2DAD4] bg-white px-2.5 text-sm text-dark outline-none focus:border-teal";

export function FormVendedor() {
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
      type: "vendedor" as const,
      nombre: String(fd.get("nombre") ?? ""),
      apellido: String(fd.get("apellido") ?? ""),
      email: String(fd.get("email") ?? ""),
      whatsapp: String(fd.get("whatsapp") ?? ""),
      cantidad_propiedades: String(fd.get("cantidad_propiedades") ?? ""),
      arrendadas: String(fd.get("arrendadas") ?? ""),
      admin_houm: String(fd.get("admin_houm") ?? ""),
      marketing_attribution: readStoredAttribution(),
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
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-teal text-xl text-white">
          ✓
        </div>
        <div className="mb-1.5 font-serif text-xl text-dark">¡Recibimos tus datos!</div>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-gray-3">
          Hemos registrado tus datos. Nos pondremos pronto en contacto contigo.
        </p>
        <button
          type="button"
          className="mt-4 flex w-full cursor-pointer items-center justify-center rounded-[9px] border-[1.5px] border-teal bg-white py-3 text-sm font-semibold text-teal transition-colors hover:bg-teal/5"
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
      <div className="mb-1.5 font-serif text-xl leading-[1.12] tracking-tight text-dark md:text-2xl">
        Vende tus
        <br />
        <em className="text-teal not-italic">propiedades.</em>
      </div>
      <p className="mb-2 border-b border-gray-1 pb-2 text-xs leading-snug text-gray-3 md:text-[13px]">
        Evaluamos si califican y te contactamos para el próximo lanzamiento. Sin compromisos.
      </p>
      <div className="mb-2 flex items-center gap-2 rounded-lg border border-[#9FE1CB] bg-teal-light px-2.5 py-1.5">
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal text-[10px] text-white">
          ✦
        </div>
        <div className="text-left text-[11px] leading-snug text-teal md:text-xs">
          <strong className="block font-semibold leading-tight">Lista de espera · 2do lanzamiento</strong>
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="mb-1.5 grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-0.5">
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
          <label className="flex flex-col gap-0.5">
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
          <label className="flex flex-col gap-0.5">
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
          <label className="flex flex-col gap-0.5">
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
        <div className="my-1.5 flex items-center gap-2">
          <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-teal">
            Tus propiedades
          </span>
          <span className="h-px flex-1 bg-gray-1" />
        </div>
        <div className="mb-1.5 flex flex-col gap-2">
          <label className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold uppercase tracking-wide leading-snug text-gray-3">
              ¿Cuántas propiedades tienes para la venta?
            </span>
            <select
              required
              name="cantidad_propiedades"
              defaultValue=""
              onInvalid={(e: InvalidEvent<HTMLSelectElement>) =>
                nativeInvalidMessageEs(e, "¿Cuántas propiedades tienes para la venta?")
              }
              onChange={clearNativeValidity}
              className={`${inputClass} w-full appearance-none pr-8`}
            >
              <option value="" disabled>
                Selecciona
              </option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5+">5 o más</option>
            </select>
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-3">¿Están arrendadas?</span>
            <select
              required
              name="arrendadas"
              defaultValue=""
              onInvalid={(e: InvalidEvent<HTMLSelectElement>) => nativeInvalidMessageEs(e, "¿Están arrendadas?")}
              onChange={clearNativeValidity}
              className={`${inputClass} w-full appearance-none pr-8`}
            >
              <option value="" disabled>
                Selecciona
              </option>
              <option value="si_todas">Sí, todas con arriendo</option>
              <option value="mixto">Algunas sí, otras no</option>
              <option value="no_ninguna">No, ninguna está arrendada</option>
            </select>
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-3">
              ¿Bajo administración Houm?
            </span>
            <select
              required
              name="admin_houm"
              defaultValue=""
              onInvalid={(e: InvalidEvent<HTMLSelectElement>) =>
                nativeInvalidMessageEs(e, "¿Bajo administración Houm?")
              }
              onChange={clearNativeValidity}
              className={`${inputClass} w-full appearance-none pr-8`}
            >
              <option value="" disabled>
                Selecciona
              </option>
              <option value="todas_houm">Sí, todas por Houm</option>
              <option value="algunas">Solo algunas</option>
              <option value="ninguna">No, ninguna con Houm</option>
            </select>
          </label>
        </div>
        {submitError ? (
          <p className="mb-2 text-center text-sm font-medium text-[#c53030]" role="alert">
            {submitError}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={submitting}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-[9px] bg-teal py-3 text-sm font-semibold text-white transition-colors hover:bg-[#085041] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 md:text-base"
        >
          {submitting ? "Enviando…" : (
            <>
              Enviar datos <span>→</span>
            </>
          )}
        </button>
        <p className="mt-1.5 text-center text-[11px] leading-relaxed text-gray-3 md:text-xs">
          Sin costo · Sin compromiso · Te contactamos para evaluar
        </p>
      </form>
    </>
  );
}
