const UF_CLP = 38_000;

export function formatPesosCompact(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  if (n >= 1_000_000) {
    return `$${(n / 1_000_000).toFixed(1).replace(".", ",")}M`;
  }
  return `$${Math.round(n).toLocaleString("es-CL")}`;
}

export function formatUFApprox(pesos: number): string {
  if (!Number.isFinite(pesos) || pesos <= 0) return "—";
  const uf = pesos / UF_CLP;
  return `${Math.round(uf).toLocaleString("es-CL")} UF aprox.`;
}

export function formatPesosAnnual(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "$0";
  return formatPesosCompact(n);
}
