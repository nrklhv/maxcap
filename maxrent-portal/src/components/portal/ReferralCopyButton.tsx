"use client";

// =============================================================================
// ReferralCopyButton — botón "Copiar" del link de referidos
// =============================================================================
// Componente cliente porque necesita `navigator.clipboard`. El link completo
// (URL del landing + `?ref=<code>`) se arma en server y se pasa como prop —
// así el componente NO necesita conocer ni el code ni el dominio del landing.
// Feedback visual breve ("Copiado ✓") por 2 segundos al copiar.
// =============================================================================

import { useState } from "react";

type Props = {
  /** URL completa para copiar (ej. `https://www.maxrent.cl/?ref=INV-AB12CD`). */
  url: string;
  className?: string;
};

export function ReferralCopyButton({ url, className }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback para navegadores antiguos / contextos sin Clipboard API.
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.setAttribute("readonly", "");
      ta.style.position = "absolute";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        /* nada más que hacer; UX silencioso. */
      }
      document.body.removeChild(ta);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={
        className ??
        "inline-flex items-center gap-1.5 rounded-md bg-orange px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-orange/90"
      }
    >
      {copied ? (
        <>
          <span aria-hidden>✓</span>
          <span>Copiado</span>
        </>
      ) : (
        <>
          <span aria-hidden>📋</span>
          <span>Copiar link</span>
        </>
      )}
    </button>
  );
}
