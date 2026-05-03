// =============================================================================
// LogoVariants — 3 propuestas de "MaxRent by Houm" para preview
// =============================================================================
// Solo se usan en /preview/logo. Una vez decidida la variante final, se
// reemplaza Logo.tsx con la elegida y este archivo se borra.
// =============================================================================

type LogoSize = "sm" | "md" | "lg";

const heightSm = 30;
const heightMd = 34;
const heightLg = 44;

const sizesByVariant = {
  // Variante A: viewBox 140x42 → escalamos manteniendo proporción.
  A: {
    sm: { w: 140, h: heightSm * 1.4 },
    md: { w: 160, h: heightMd * 1.4 },
    lg: { w: 200, h: heightLg * 1.4 },
  },
  // Variante B: una sola línea, más ancha (175x30).
  B: {
    sm: { w: 175, h: heightSm },
    md: { w: 200, h: heightMd },
    lg: { w: 250, h: heightLg },
  },
  // Variante C: chevrones grandes + by Houm anclado a la derecha.
  C: {
    sm: { w: 140, h: heightSm * 1.45 },
    md: { w: 160, h: heightMd * 1.45 },
    lg: { w: 200, h: heightLg * 1.45 },
  },
};

// -----------------------------------------------------------------------------
// VARIANTE A — Compacta vertical, "by Houm" centrado debajo
// -----------------------------------------------------------------------------
export function LogoA({
  size = "sm",
  className = "",
}: {
  size?: LogoSize;
  className?: string;
}) {
  const { w, h } = sizesByVariant.A[size];
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 140 42"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="MaxRent by Houm"
    >
      <title>MaxRent by Houm</title>
      <polyline
        points="16.3,3.6 2.8,15.0 16.3,26.4"
        stroke="#FF6701"
        strokeWidth="3"
        strokeLinecap="square"
        fill="none"
      />
      <polyline
        points="27.5,3.6 14.0,15.0 27.5,26.4"
        stroke="#CC4A28"
        strokeWidth="3"
        strokeLinecap="square"
        fill="none"
      />
      <text
        x="36"
        y="20.5"
        fontFamily="'DM Sans',system-ui,sans-serif"
        fontSize="15.4"
        fontWeight="300"
        letterSpacing="2"
        fill="#EDE0CC"
      >
        MAXRENT
      </text>
      <text
        x="83"
        y="36"
        fontFamily="'DM Sans',system-ui,sans-serif"
        fontSize="7.4"
        fontWeight="400"
        letterSpacing="0.6"
        fill="#EDE0CC"
        fillOpacity="0.7"
        textAnchor="middle"
      >
        by Houm
      </text>
    </svg>
  );
}

// -----------------------------------------------------------------------------
// VARIANTE B — Horizontal con divisor, "MAXRENT · by Houm" en una línea
// -----------------------------------------------------------------------------
export function LogoB({
  size = "sm",
  className = "",
}: {
  size?: LogoSize;
  className?: string;
}) {
  const { w, h } = sizesByVariant.B[size];
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 175 30"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="MaxRent by Houm"
    >
      <title>MaxRent by Houm</title>
      <polyline
        points="16.3,3.6 2.8,15.0 16.3,26.4"
        stroke="#FF6701"
        strokeWidth="3"
        strokeLinecap="square"
        fill="none"
      />
      <polyline
        points="27.5,3.6 14.0,15.0 27.5,26.4"
        stroke="#CC4A28"
        strokeWidth="3"
        strokeLinecap="square"
        fill="none"
      />
      <text
        x="36"
        y="21.6"
        fontFamily="'DM Sans',system-ui,sans-serif"
        fontSize="15.4"
        fontWeight="300"
        letterSpacing="2"
        fill="#EDE0CC"
      >
        MAXRENT
      </text>
      {/* Divisor (punto medio) */}
      <circle cx="135" cy="15" r="1.4" fill="#EDE0CC" fillOpacity="0.55" />
      <text
        x="142"
        y="20"
        fontFamily="'DM Sans',system-ui,sans-serif"
        fontSize="9.5"
        fontWeight="400"
        letterSpacing="0.5"
        fill="#EDE0CC"
        fillOpacity="0.78"
      >
        by Houm
      </text>
    </svg>
  );
}

// -----------------------------------------------------------------------------
// VARIANTE C — Asimétrica, chevrones grandes, "by Houm" alineado a la derecha
// -----------------------------------------------------------------------------
export function LogoC({
  size = "sm",
  className = "",
}: {
  size?: LogoSize;
  className?: string;
}) {
  const { w, h } = sizesByVariant.C[size];
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 140 44"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="MaxRent by Houm"
    >
      <title>MaxRent by Houm</title>
      {/* Chevrones más altos: 2 → 30 (altura 28) en vez de 3.6 → 26.4 */}
      <polyline
        points="18.5,4 3,17 18.5,30"
        stroke="#FF6701"
        strokeWidth="3.4"
        strokeLinecap="square"
        fill="none"
      />
      <polyline
        points="31.5,4 16,17 31.5,30"
        stroke="#CC4A28"
        strokeWidth="3.4"
        strokeLinecap="square"
        fill="none"
      />
      <text
        x="40"
        y="22"
        fontFamily="'DM Sans',system-ui,sans-serif"
        fontSize="15.4"
        fontWeight="300"
        letterSpacing="2"
        fill="#EDE0CC"
      >
        MAXRENT
      </text>
      <text
        x="135"
        y="38"
        fontFamily="'DM Sans',system-ui,sans-serif"
        fontSize="8"
        fontWeight="400"
        letterSpacing="0.6"
        fill="#EDE0CC"
        fillOpacity="0.7"
        textAnchor="end"
      >
        by Houm
      </text>
    </svg>
  );
}
