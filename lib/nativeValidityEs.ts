import type { ChangeEvent, FormEvent, InvalidEvent } from "react";

import { isChileMobile } from "./chilePhone";

export function clearNativeValidity(e: {
  currentTarget: HTMLInputElement | HTMLSelectElement;
}) {
  e.currentTarget.setCustomValidity("");
}

export function nativeInvalidMessageEs(
  e: InvalidEvent<HTMLInputElement | HTMLSelectElement>,
  fieldLabel: string,
) {
  const el = e.currentTarget;
  if (el.validity.valueMissing) {
    el.setCustomValidity(`Completa el campo «${fieldLabel}».`);
    return;
  }
  if (el instanceof HTMLInputElement && el.type === "email" && el.validity.typeMismatch) {
    el.setCustomValidity("Introduce un correo electrónico válido.");
    return;
  }
  el.setCustomValidity("Revisa este campo.");
}

const WHATSAPP_HINT = "Usa un celular chileno: 9 XXXX XXXX o +56 9 XXXX XXXX.";

export function spanishWhatsAppInvalid(e: InvalidEvent<HTMLInputElement>) {
  const el = e.currentTarget;
  if (el.validity.valueMissing) {
    el.setCustomValidity(`Completa el campo «WhatsApp».`);
    return;
  }
  if (!isChileMobile(el.value)) {
    el.setCustomValidity(WHATSAPP_HINT);
    return;
  }
  el.setCustomValidity("");
}

export function clearWhatsAppValidity(e: ChangeEvent<HTMLInputElement> | FormEvent<HTMLInputElement>) {
  e.currentTarget.setCustomValidity("");
}

/** Marca error de formato si hay texto y no calza celular chileno (dejar vacío al validador `required`). */
export function applyWhatsAppChileFormatValidity(input: HTMLInputElement) {
  input.setCustomValidity("");
  if (input.value.trim() && !isChileMobile(input.value)) {
    input.setCustomValidity(WHATSAPP_HINT);
  }
}
