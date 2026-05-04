"use client";

import { useState } from "react";

type Props = {
  name: string;
  hex: string;
  note?: string;
  /** Color del texto sobre el swatch (para que sea legible) */
  textColor?: "light" | "dark";
};

export function ColorSwatch({ name, hex, note, textColor = "dark" }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore — algunos browsers bloquean clipboard si no es https
    }
  }

  const text = textColor === "light" ? "text-white" : "text-dark";

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="group relative flex flex-col justify-between aspect-square rounded-2xl p-4 text-left transition hover:shadow-lg overflow-hidden"
      style={{ backgroundColor: hex }}
      aria-label={`Copiar ${hex}`}
    >
      <span className={`text-xs font-medium ${text} opacity-80`}>{name}</span>
      <div className="flex items-end justify-between">
        <span className={`text-sm font-mono ${text}`}>{hex}</span>
        <span
          className={`text-[10px] uppercase tracking-wider ${text} opacity-0 group-hover:opacity-70 transition`}
        >
          {copied ? "✓ copiado" : "click para copiar"}
        </span>
      </div>
      {note && (
        <span
          className={`absolute bottom-2 right-3 text-[10px] ${text} opacity-50`}
        >
          {note}
        </span>
      )}
    </button>
  );
}
