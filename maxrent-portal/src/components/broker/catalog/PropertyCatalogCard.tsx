"use client";

/**
 * Single property card in the broker catalog grid (ficha v3).
 *
 * @domain broker
 */

import type { BrokerCatalogPaymentsByPropertyId } from "@/lib/broker/catalog-types";
import type { BrokerCatalogProperty } from "@/lib/broker/catalog-types";
import {
  CATALOG_UF_CLP,
  capRate,
  capRateBand,
  capRateEmoji,
  capRateNote,
  formatArriendoDisplay,
  formatClp,
  formatPct,
  formatVentaDisplay,
  payAnalysis,
  paymentDotsCard,
} from "@/lib/broker/catalog-calculations";
import { capRateTextClass, paymentDotCardClasses } from "./payment-dot-styles";

interface PropertyCatalogCardProps {
  property: BrokerCatalogProperty;
  paymentsById: BrokerCatalogPaymentsByPropertyId;
  referenceDate: Date;
}

export function PropertyCatalogCard({
  property: p,
  paymentsById,
  referenceDate,
}: PropertyCatalogCardProps) {
  const cr = capRate(p, CATALOG_UF_CLP);
  const band = capRateBand(cr);
  const crStr = cr != null ? formatPct(cr) : "N/D";
  const analysis = payAnalysis(p.id, paymentsById);
  const dots = paymentDotsCard(p.id, paymentsById, referenceDate);
  const mapHref = `https://www.google.com/maps?q=${p.lat},${p.lng}`;

  const amenity = (on: boolean, label: string) => (
    <span
      className={`rounded-sm border px-1.5 py-0.5 text-[0.58rem] ${
        on
          ? "border-[#e8f4ee] bg-[#e8f4ee] text-[#2d6a4f]"
          : "border-[#e0dbd3] text-[#8a8a8a] line-through opacity-45"
      }`}
    >
      {label}
    </span>
  );

  return (
    <article className="overflow-hidden rounded-sm border border-[#e0dbd3] bg-[#fdfcfa] shadow-sm transition-shadow hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative flex h-[170px] items-center justify-center overflow-hidden bg-gradient-to-br from-[#e8e3da] to-[#d4cfc6]">
        <div
          className="pointer-events-none absolute inset-0 opacity-100"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg,transparent,transparent 18px,rgba(0,0,0,0.03) 18px,rgba(0,0,0,0.03) 19px)",
          }}
        />
        <span className="relative z-[1] text-4xl opacity-15">🏢</span>
        <div className="absolute left-2 top-2 z-[2] flex items-center gap-1 rounded-sm bg-[#2d6a4f] px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-widest text-white">
          <span className="inline-block h-[5px] w-[5px] animate-pulse rounded-full bg-[#7dcea0]" />
          Arrendada
        </div>
        <div className="absolute right-2 top-2 z-[2] rounded-sm bg-[#1a1a1a]/80 px-2 py-0.5 text-[0.6rem] font-bold text-white">
          {analysis.stars} {analysis.score !== null ? `${analysis.score}%` : "—"}
        </div>
        <a
          href={mapHref}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-2 left-2 z-[2] rounded-sm bg-white/90 px-2 py-0.5 text-[0.58rem] font-bold tracking-wide text-[#1a1a1a] hover:bg-white"
        >
          📍 Ver en mapa
        </a>
        <div className="absolute bottom-2 right-2 z-[2] rounded-sm bg-[#1a1a1a]/70 px-2 py-0.5 text-[0.6rem] text-white">
          📷 {p.fotos}
        </div>
      </div>

      <div className="px-[18px] pb-0 pt-3.5">
        <div className="mb-0.5 text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[#b8962e]">
          {p.tipo} · {p.m2} m²
        </div>
        <div className="mb-3 font-serif text-[0.95rem] font-medium leading-snug text-[#1a1a1a]">
          {p.comuna} · {p.dorm} dorm · {p.ban} baño{p.ban > 1 ? "s" : ""}
        </div>
        <div className="-mx-[18px] mb-2.5 flex border-y border-[#e0dbd3]">
          {[
            { v: p.dorm, l: "Dorm." },
            { v: p.ban, l: "Baños" },
            { v: p.estac, l: "Estac." },
            { v: p.m2, l: "m²" },
          ].map((s, i) => (
            <div
              key={s.l}
              className={`flex-1 border-[#e0dbd3] py-2 text-center ${i < 3 ? "border-r" : ""}`}
            >
              <div className="font-serif text-base font-medium leading-none text-[#1a1a1a]">{s.v}</div>
              <div className="mt-0.5 text-[0.54rem] uppercase tracking-wide text-[#8a8a8a]">{s.l}</div>
            </div>
          ))}
        </div>
        <div className="mb-3 flex flex-wrap gap-1">
          {amenity(p.piscina, "Piscina")}
          {amenity(p.gym, "Gym")}
          {amenity(p.mascotas, "Mascotas")}
          {amenity(p.balcon, "Balcón")}
          {amenity(p.bodega, "Bodega")}
          {amenity(p.ac, "A/C")}
          {amenity(p.furnished === "fully", "Amoblado")}
        </div>
      </div>

      <div className="-mx-0 border-t border-[#e0dbd3] bg-[#f7f4ef] px-[18px] py-2.5">
        <div className="mb-1 flex items-baseline justify-between">
          <span className="text-[0.6rem] uppercase tracking-wide text-[#8a8a8a]">
            Arriendo actual
          </span>
          <div className="text-right">
            <div className={`font-serif text-[0.92rem] font-medium text-[#2d6a4f]`}>
              {formatArriendoDisplay(p)}
            </div>
            <div className="text-[0.58rem] text-[#8a8a8a]">
              GC: {formatClp(p.gc)} · no incluido
            </div>
          </div>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-[0.6rem] uppercase tracking-wide text-[#8a8a8a]">
            Precio venta
          </span>
          <span className="font-serif text-[0.92rem] font-medium text-[#b8962e]">
            {formatVentaDisplay(p)}
          </span>
        </div>
      </div>

      <div className="-mx-0 flex items-center justify-between border-y border-[#e0dbd3] bg-white px-[18px] py-2">
        <div className="text-[0.6rem] uppercase tracking-wide text-[#8a8a8a]">Cap Rate</div>
        <div className={`font-serif text-2xl font-bold tracking-tight ${capRateTextClass(band)}`}>
          {crStr}
        </div>
        <div className="max-w-[120px] text-right text-[0.56rem] leading-snug text-[#8a8a8a]">
          {cr != null ? `${capRateEmoji(cr)} ` : ""}
          {capRateNote(cr)}
          <br />
          Ref. mercado: 4–6%
        </div>
      </div>

      <div className="border-t border-[#e0dbd3] px-[18px] py-3">
        <div className="mb-2 flex items-center justify-between text-[0.58rem] uppercase tracking-wide text-[#8a8a8a]">
          Pagos · últimos 12 meses
          <span className="font-bold text-[#1a1a1a]">
            {analysis.pagados.length}/{analysis.vencidos.length} al día
          </span>
        </div>
        <div className="mb-2 flex flex-wrap gap-1">
          {dots.map((d, i) => (
            <div
              key={`${p.id}-${i}`}
              className={paymentDotCardClasses(d.kind)}
              title={d.title}
            >
              <abbr title={d.title} className="no-underline">
                {d.symbol}
              </abbr>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 text-[0.58rem] font-bold">
          <span className="rounded-full bg-[#e8f4ee] px-2 py-0.5 text-[#2d6a4f]">✓ Al día (0d)</span>
          <span className="rounded-full bg-[#fffbea] px-2 py-0.5 text-[#b7940a]">✓ Leve (1–5d)</span>
          <span className="rounded-full bg-[#fff3e0] px-2 py-0.5 text-[#c05621]">! Moderado (6–15d)</span>
          <span className="rounded-full bg-[#fdecea] px-2 py-0.5 text-[#c0392b]">!! Grave</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-[#e0dbd3] px-[18px] py-2.5">
        <div>
          <div className="mb-0.5 text-[0.56rem] uppercase tracking-wide text-[#8a8a8a]">
            Inicio contrato
          </div>
          <div className="text-[0.78rem] font-bold text-[#1a1a1a]">{p.inicio}</div>
        </div>
        <div>
          <div className="mb-0.5 text-[0.56rem] uppercase tracking-wide text-[#8a8a8a]">
            Meses arrendado
          </div>
          <div className="text-[0.78rem] font-bold text-[#1a1a1a]">
            {p.meses === 0 ? "Reciente" : `${p.meses} meses`}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[#e0dbd3] px-[18px] py-2">
        <span className="font-mono text-[0.56rem] tracking-wide text-[#8a8a8a]">ID #{p.id}</span>
        <button
          type="button"
          className="cursor-not-allowed rounded-sm bg-[#1a1a1a] px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-wide text-[#f7f4ef] opacity-60"
          disabled
          title="Próximamente: envío de ficha a tus clientes desde el portal"
        >
          Enviar ficha →
        </button>
      </div>
    </article>
  );
}
