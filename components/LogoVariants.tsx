// =============================================================================
// LogoVariants — propuestas de "MaxRent by Houm" para preview
// =============================================================================
// Solo se usan en /preview/logo. Una vez decidida la variante final, se
// reemplaza Logo.tsx con la elegida y este archivo se borra.
// =============================================================================

import type { ReactNode } from "react";

type LogoSize = "sm" | "md" | "lg";

const SCALE: Record<LogoSize, number> = {
  sm: 1,
  md: 1.14,
  lg: 1.45,
};

// -----------------------------------------------------------------------------
// Wrapper común — define el viewBox 140x42 para todas las variantes C*
// y dibuja chevrones + MAXRENT (subido respecto a la C original).
// -----------------------------------------------------------------------------

function CBase({ size, children }: { size: LogoSize; children: ReactNode }) {
  const baseW = 140;
  const baseH = 42;
  const w = baseW * SCALE[size];
  const h = baseH * SCALE[size];
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${baseW} ${baseH}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="MaxRent by Houm"
    >
      <title>MaxRent by Houm</title>
      {/* Chevrones: subidos al rango y=3..y=26 (centro y=14.5) */}
      <polyline
        points="18.5,3 3,14.5 18.5,26"
        stroke="#FF6701"
        strokeWidth="3"
        strokeLinecap="square"
        fill="none"
      />
      <polyline
        points="31.5,3 16,14.5 31.5,26"
        stroke="#CC4A28"
        strokeWidth="3"
        strokeLinecap="square"
        fill="none"
      />
      {/* MAXRENT: baseline y=21 → centro óptico ~y=15 (alineado al centro de chevrones) */}
      <text
        x="40"
        y="21"
        fontFamily="'DM Sans',system-ui,sans-serif"
        fontSize="15.4"
        fontWeight="300"
        letterSpacing="2"
        fill="#EDE0CC"
      >
        MAXRENT
      </text>
      {children}
    </svg>
  );
}

// -----------------------------------------------------------------------------
// 9 variantes que solo cambian la presentación del "by Houm"
// -----------------------------------------------------------------------------

export function LogoC1({ size = "sm" }: { size?: LogoSize }) {
  // Pequeño + derecha + sutil
  return (
    <CBase size={size}>
      <text
        x="132"
        y="36"
        fontFamily="'DM Sans',system-ui,sans-serif"
        fontSize="7"
        fontWeight="400"
        letterSpacing="0.5"
        fill="#EDE0CC"
        fillOpacity="0.6"
        textAnchor="end"
      >
        by Houm
      </text>
    </CBase>
  );
}

export function LogoC2({ size = "sm" }: { size?: LogoSize }) {
  // Mediano + derecha
  return (
    <CBase size={size}>
      <text
        x="132"
        y="37"
        fontFamily="'DM Sans',system-ui,sans-serif"
        fontSize="8.5"
        fontWeight="400"
        letterSpacing="0.6"
        fill="#EDE0CC"
        fillOpacity="0.75"
        textAnchor="end"
      >
        by Houm
      </text>
    </CBase>
  );
}

export function LogoC3({ size = "sm" }: { size?: LogoSize }) {
  // Grande + derecha + más presencia
  return (
    <CBase size={size}>
      <text
        x="132"
        y="38"
        fontFamily="'DM Sans',system-ui,sans-serif"
        fontSize="10"
        fontWeight="400"
        letterSpacing="0.8"
        fill="#EDE0CC"
        fillOpacity="0.85"
        textAnchor="end"
      >
        by Houm
      </text>
    </CBase>
  );
}

export function LogoC4({ size = "sm" }: { size?: LogoSize }) {
  // Pequeño + centrado debajo de MAXRENT
  return (
    <CBase size={size}>
      <text
        x="86"
        y="36"
        fontFamily="'DM Sans',system-ui,sans-serif"
        fontSize="7.5"
        fontWeight="400"
        letterSpacing="0.5"
        fill="#EDE0CC"
        fillOpacity="0.6"
        textAnchor="middle"
      >
        by Houm
      </text>
    </CBase>
  );
}

export function LogoC5({ size = "sm" }: { size?: LogoSize }) {
  // Mediano + centrado
  return (
    <CBase size={size}>
      <text
        x="86"
        y="37"
        fontFamily="'DM Sans',system-ui,sans-serif"
        fontSize="9"
        fontWeight="400"
        letterSpacing="0.7"
        fill="#EDE0CC"
        fillOpacity="0.8"
        textAnchor="middle"
      >
        by Houm
      </text>
    </CBase>
  );
}

export function LogoC6({ size = "sm" }: { size?: LogoSize }) {
  // Grande + centrado — más "cuadrado", más balanceado
  return (
    <CBase size={size}>
      <text
        x="86"
        y="38"
        fontFamily="'DM Sans',system-ui,sans-serif"
        fontSize="11"
        fontWeight="400"
        letterSpacing="0.9"
        fill="#EDE0CC"
        fillOpacity="0.9"
        textAnchor="middle"
      >
        by Houm
      </text>
    </CBase>
  );
}

export function LogoC7({ size = "sm" }: { size?: LogoSize }) {
  // Mediano + alineado a la izquierda (con la M de MAXRENT)
  return (
    <CBase size={size}>
      <text
        x="40"
        y="37"
        fontFamily="'DM Sans',system-ui,sans-serif"
        fontSize="8.5"
        fontWeight="400"
        letterSpacing="0.6"
        fill="#EDE0CC"
        fillOpacity="0.75"
      >
        by Houm
      </text>
    </CBase>
  );
}

export function LogoC8({ size = "sm" }: { size?: LogoSize }) {
  // Centrado con líneas decorativas a los lados (sello)
  return (
    <CBase size={size}>
      <line x1="48" y1="34.5" x2="68" y2="34.5" stroke="#EDE0CC" strokeOpacity="0.4" strokeWidth="0.6" />
      <text
        x="86"
        y="37"
        fontFamily="'DM Sans',system-ui,sans-serif"
        fontSize="9"
        fontWeight="400"
        letterSpacing="0.7"
        fill="#EDE0CC"
        fillOpacity="0.8"
        textAnchor="middle"
      >
        by Houm
      </text>
      <line x1="104" y1="34.5" x2="124" y2="34.5" stroke="#EDE0CC" strokeOpacity="0.4" strokeWidth="0.6" />
    </CBase>
  );
}

export function LogoC9({ size = "sm" }: { size?: LogoSize }) {
  // Italic + derecha — toque editorial
  return (
    <CBase size={size}>
      <text
        x="132"
        y="37"
        fontFamily="'DM Serif Display','DM Sans',system-ui,serif"
        fontSize="9.5"
        fontStyle="italic"
        fontWeight="400"
        letterSpacing="0.4"
        fill="#EDE0CC"
        fillOpacity="0.85"
        textAnchor="end"
      >
        by Houm
      </text>
    </CBase>
  );
}

// -----------------------------------------------------------------------------
// A y B — referencias originales (las dejamos para comparar si hace falta)
// -----------------------------------------------------------------------------

export function LogoA({ size = "sm" }: { size?: LogoSize }) {
  const baseW = 140;
  const baseH = 42;
  return (
    <svg
      width={baseW * SCALE[size]}
      height={baseH * SCALE[size]}
      viewBox="0 0 140 42"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="MaxRent by Houm"
    >
      <title>MaxRent by Houm</title>
      <polyline points="16.3,3.6 2.8,15.0 16.3,26.4" stroke="#FF6701" strokeWidth="3" strokeLinecap="square" fill="none" />
      <polyline points="27.5,3.6 14.0,15.0 27.5,26.4" stroke="#CC4A28" strokeWidth="3" strokeLinecap="square" fill="none" />
      <text x="36" y="20.5" fontFamily="'DM Sans',system-ui,sans-serif" fontSize="15.4" fontWeight="300" letterSpacing="2" fill="#EDE0CC">
        MAXRENT
      </text>
      <text x="83" y="36" fontFamily="'DM Sans',system-ui,sans-serif" fontSize="7.4" fontWeight="400" letterSpacing="0.6" fill="#EDE0CC" fillOpacity="0.7" textAnchor="middle">
        by Houm
      </text>
    </svg>
  );
}

export function LogoB({ size = "sm" }: { size?: LogoSize }) {
  const baseW = 175;
  const baseH = 30;
  return (
    <svg
      width={baseW * SCALE[size]}
      height={baseH * SCALE[size]}
      viewBox="0 0 175 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="MaxRent by Houm"
    >
      <title>MaxRent by Houm</title>
      <polyline points="16.3,3.6 2.8,15.0 16.3,26.4" stroke="#FF6701" strokeWidth="3" strokeLinecap="square" fill="none" />
      <polyline points="27.5,3.6 14.0,15.0 27.5,26.4" stroke="#CC4A28" strokeWidth="3" strokeLinecap="square" fill="none" />
      <text x="36" y="21.6" fontFamily="'DM Sans',system-ui,sans-serif" fontSize="15.4" fontWeight="300" letterSpacing="2" fill="#EDE0CC">
        MAXRENT
      </text>
      <circle cx="135" cy="15" r="1.4" fill="#EDE0CC" fillOpacity="0.55" />
      <text x="142" y="20" fontFamily="'DM Sans',system-ui,sans-serif" fontSize="9.5" fontWeight="400" letterSpacing="0.5" fill="#EDE0CC" fillOpacity="0.78">
        by Houm
      </text>
    </svg>
  );
}

// La C original se mantiene para comparar con las nuevas
export function LogoC({ size = "sm" }: { size?: LogoSize }) {
  const baseW = 140;
  const baseH = 44;
  return (
    <svg
      width={baseW * SCALE[size]}
      height={baseH * SCALE[size]}
      viewBox="0 0 140 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="MaxRent by Houm"
    >
      <title>MaxRent by Houm</title>
      <polyline points="18.5,4 3,17 18.5,30" stroke="#FF6701" strokeWidth="3.4" strokeLinecap="square" fill="none" />
      <polyline points="31.5,4 16,17 31.5,30" stroke="#CC4A28" strokeWidth="3.4" strokeLinecap="square" fill="none" />
      <text x="40" y="22" fontFamily="'DM Sans',system-ui,sans-serif" fontSize="15.4" fontWeight="300" letterSpacing="2" fill="#EDE0CC">
        MAXRENT
      </text>
      <text x="135" y="38" fontFamily="'DM Sans',system-ui,sans-serif" fontSize="8" fontWeight="400" letterSpacing="0.6" fill="#EDE0CC" fillOpacity="0.7" textAnchor="end">
        by Houm
      </text>
    </svg>
  );
}
