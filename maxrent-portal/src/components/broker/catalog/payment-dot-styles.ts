import type { PaymentDotKind } from "@/lib/broker/catalog-types";

/** Tailwind classes for 12m payment dots (card size). */
export function paymentDotCardClasses(kind: PaymentDotKind): string {
  const base =
    "flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[3px] text-[0.52rem] font-bold";
  switch (kind) {
    case "nodata":
      return `${base} border border-dashed border-[#ddd] bg-[#f7f7f7] text-[#ccc]`;
    case "future":
      return `${base} border border-[#e0e0e0] bg-[#f0f0f0] text-[#bbb]`;
    case "paid":
      return `${base} border border-[#b8dfc9] bg-[#e8f4ee] text-[#2d6a4f]`;
    case "late-leve":
      return `${base} border border-[#f0d97a] bg-[#fffbea] text-[#b7940a]`;
    case "late-mod":
      return `${base} border border-[#f6c89a] bg-[#fff3e0] text-[#c05621]`;
    case "late-grave":
      return `${base} border border-[#f5c0bb] bg-[#fdecea] text-[#c0392b]`;
    default:
      return base;
  }
}

/** Tailwind for list row mini dots (same color semantics as HTML list view). */
export function paymentDotListClasses(kind: PaymentDotKind): string {
  const base = "h-2.5 w-2.5 shrink-0 rounded-sm";
  switch (kind) {
    case "nodata":
      return `${base} border border-dashed border-[#ddd] bg-[#f7f7f7]`;
    case "future":
      return `${base} border border-[#e0e0e0] bg-[#f0f0f0]`;
    case "paid":
      return `${base} border border-[#b8dfc9] bg-[#e8f4ee]`;
    case "late-leve":
      return `${base} border border-[#f0d97a] bg-[#fffbea]`;
    case "late-mod":
      return `${base} border border-[#f6c89a] bg-[#fff3e0]`;
    case "late-grave":
      return `${base} border border-[#f5c0bb] bg-[#fdecea]`;
    default:
      return `${base} bg-[#f7f7f7]`;
  }
}

export function capRateTextClass(band: "good" | "mid" | "low"): string {
  switch (band) {
    case "good":
      return "text-[#2d6a4f]";
    case "mid":
      return "text-[#c05621]";
    default:
      return "text-[#c0392b]";
  }
}
