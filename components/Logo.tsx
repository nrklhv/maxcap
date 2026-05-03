// =============================================================================
// Logo — MaxRent by Houm
// =============================================================================
// Wordmark "MAXRENT" en weight 300, color crema (#EDE0CC), con dos chevrones
// (naranja brillante + naranja quemado) a la izquierda y "by Houm" en italic
// serif alineado a la derecha como sello editorial.
//
// API estable: <Logo size="sm | md | lg" className="..." />.
// El viewBox 140×42 es la canonical aspect ratio; `sizes` solo escala.
// =============================================================================

type LogoSize = "sm" | "md" | "lg";

const sizes: Record<LogoSize, { w: number; h: number }> = {
  sm: { w: 140, h: 42 },
  md: { w: 160, h: 48 },
  lg: { w: 200, h: 60 },
};

export function Logo({
  size = "sm",
  className = "",
}: {
  size?: LogoSize;
  className?: string;
}) {
  const { w, h } = sizes[size];
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
      {/* Chevrón izquierdo (atrás): naranja brillante */}
      <polyline
        points="18.5,3 3,14.5 18.5,26"
        stroke="#FF6701"
        strokeWidth="3"
        strokeLinecap="square"
        fill="none"
      />
      {/* Chevrón derecho (adelante): naranja quemado */}
      <polyline
        points="31.5,3 16,14.5 31.5,26"
        stroke="#CC4A28"
        strokeWidth="3"
        strokeLinecap="square"
        fill="none"
      />
      {/* Wordmark MAXRENT */}
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
      {/* Endoso "by Houm" — italic serif, alineado a la derecha */}
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
    </svg>
  );
}
