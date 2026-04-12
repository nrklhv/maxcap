import { formatPesosCompact, formatUFApprox } from "@/lib/format";

export function CapRateCard({
  rateLabel,
  tag,
  pesos,
  recommended,
}: {
  rateLabel: string;
  tag: string;
  pesos: number;
  recommended?: boolean;
}) {
  const hasValue = pesos > 0;
  return (
    <div
      className={`grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-xl border p-5 transition-all duration-200 hover:translate-x-0.5 ${
        recommended
          ? "border-teal bg-teal-light"
          : "border-gray-1 bg-white hover:border-teal"
      }`}
    >
      <div
        className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold text-white ${
          recommended ? "bg-teal" : "bg-dark"
        }`}
      >
        {rateLabel}
      </div>
      <div className="min-w-0">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-3">{tag}</div>
        <div className={`font-serif text-3xl tracking-tight ${recommended ? "text-teal" : "text-dark"}`}>
          {hasValue ? formatPesosCompact(pesos) : "—"}
        </div>
        <div className="mt-1 text-xs text-gray-3">
          {hasValue ? formatUFApprox(pesos) : "ingresa el arriendo para calcular"}
        </div>
      </div>
      <span className={`text-lg ${recommended ? "text-teal" : "text-gray-2 opacity-20"}`}>
        {recommended ? "★★" : "★"}
      </span>
    </div>
  );
}
