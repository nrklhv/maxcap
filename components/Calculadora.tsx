"use client";

import { useMemo, useState } from "react";
import { CapRateCard } from "./CapRateCard";
import { formatPesosAnnual } from "@/lib/format";

type RateId = "45" | "50" | "55" | "60";

const RATES: {
  id: RateId;
  pct: number;
  label: string;
  tag: string;
  recommended: boolean;
}[] = [
  { id: "45", pct: 0.045, label: "4,5% cap rate", tag: "Precio referencial máximo", recommended: false },
  { id: "50", pct: 0.05, label: "5,0% cap rate", tag: "✦ Precio recomendado para el Club", recommended: true },
  { id: "55", pct: 0.055, label: "5,5% cap rate", tag: "Precio muy atractivo para el inversionista", recommended: false },
  { id: "60", pct: 0.06, label: "6,0% cap rate", tag: "Cierre más rápido — alta demanda", recommended: false },
];

export function Calculadora() {
  const [raw, setRaw] = useState("");
  const mensual = parseFloat(raw.replace(/\./g, "").replace(",", ".")) || 0;
  const anual = mensual * 12;

  const valores = useMemo((): Record<RateId, number> => {
    const empty: Record<RateId, number> = { 45: 0, 50: 0, 55: 0, 60: 0 };
    if (mensual <= 0) return empty;
    const out: Record<RateId, number> = { ...empty };
    for (const r of RATES) {
      out[r.id] = anual / r.pct;
    }
    return out;
  }, [anual, mensual]);

  return (
    <section className="bg-cream px-4 py-16 md:px-10 md:py-[4.5rem]" id="calculadora">
      <div className="eyebrow mb-3 text-xs font-semibold uppercase tracking-widest text-teal">Calculadora de valor</div>
      <h2 className="mb-2 font-serif text-3xl tracking-tight text-dark md:text-[clamp(24px,2.2vw+14px,52px)]">
        ¿Cuánto vale tu propiedad?
      </h2>
      <p className="mb-10 max-w-xl text-sm leading-relaxed text-gray-3">
        Ingresa el arriendo mensual y calcula el rango de precio según cap rate — desde el mínimo que acepta un
        inversionista hasta el más atractivo.
      </p>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-8">
        <div className="rounded-2xl border-[1.5px] border-gray-1 bg-white p-8">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-teal">Arriendo mensual actual</div>
          <div className="relative mb-6">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-medium text-gray-3">
              $
            </span>
            <input
              type="text"
              inputMode="numeric"
              className="h-[58px] w-full rounded-[10px] border-[1.5px] border-[#E2DAD4] py-0 pl-8 pr-3.5 font-sans text-2xl font-medium text-dark outline-none transition-colors focus:border-teal"
              placeholder="400.000"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between rounded-[10px] border border-[#9FE1CB] bg-teal-light px-4 py-3">
            <span className="text-xs text-teal">Arriendo anual</span>
            <span className="text-lg font-semibold text-dark">{formatPesosAnnual(anual)}</span>
          </div>
          <div className="mt-6">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-teal">
              Cap rate — rango del mercado
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-gray-1 bg-cream px-3 py-2.5 text-center">
                <div className="mb-1 text-xs uppercase tracking-wide text-gray-3">Mínimo</div>
                <div className="text-lg font-semibold text-teal">4,5%</div>
                <div className="mt-0.5 text-xs text-gray-3">umbral del mercado</div>
              </div>
              <div className="rounded-lg border border-gray-1 bg-cream px-3 py-2.5 text-center">
                <div className="mb-1 text-xs uppercase tracking-wide text-gray-3">Atractivo</div>
                <div className="text-lg font-semibold text-orange-2">6,0%</div>
                <div className="mt-0.5 text-xs text-gray-3">muy competitivo</div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-3">
            Valor estimado según cap rate
          </div>
          <p className="mb-2 text-xs leading-relaxed text-gray-3">
            El <strong className="text-teal">5,0% es el punto ideal</strong> — precio justo para ti y muy atractivo
            para el inversionista.
          </p>
          <div className="flex flex-col gap-2.5">
            {RATES.map((r) => (
              <CapRateCard
                key={r.id}
                rateLabel={r.label}
                tag={r.tag}
                pesos={valores[r.id]}
                recommended={r.recommended}
              />
            ))}
          </div>
          {mensual > 0 && (
            <div className="mt-4 rounded-[10px] border border-orange/30 bg-orange-light p-4 text-xs leading-relaxed text-[#CC4E00]">
              <strong className="text-orange">El 5,0% es el punto ideal del Club.</strong> Genera el mejor equilibrio
              entre precio para el vendedor y atractivo para el inversionista.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
