// =============================================================================
// Logo — MaxRent by Houm
// =============================================================================
// Wordmark "MAXRENT" + chevrones (naranja brillante + naranja quemado) +
// "by Houm" en italic serif. Mismo SVG que el landing público (BRIEF.md),
// con prop `tone` para usarse sobre fondos claros (sidebars del portal,
// pantalla de login) o fondos oscuros (header marketing, hero).
//
// API: <Logo size="sm | md | lg" tone="light | dark" className="..." />.
// - tone="light" (default): wordmark en cremita (#EDE0CC), para fondos oscuros.
// - tone="dark": wordmark en azul oscuro (#001F30), para fondos claros del portal.
// =============================================================================

type LogoSize = "sm" | "md" | "lg";
type LogoTone = "light" | "dark";

const sizes: Record<LogoSize, { w: number; h: number }> = {
  sm: { w: 140, h: 42 },
  md: { w: 160, h: 48 },
  lg: { w: 200, h: 60 },
};

export function Logo({
  size = "sm",
  tone = "light",
  className = "",
}: {
  size?: LogoSize;
  tone?: LogoTone;
  className?: string;
}) {
  const { w, h } = sizes[size];
  const wordmarkFill = tone === "dark" ? "#001F30" : "#EDE0CC";
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
      <text
        x="40"
        y="21"
        fontFamily="'DM Sans',system-ui,sans-serif"
        fontSize="15.4"
        fontWeight="300"
        letterSpacing="2"
        fill={wordmarkFill}
      >
        MAXRENT
      </text>
      <text
        x="132"
        y="37"
        fontFamily="'DM Serif Display','DM Sans',system-ui,serif"
        fontSize="9.5"
        fontStyle="italic"
        fontWeight="400"
        letterSpacing="0.4"
        fill={wordmarkFill}
        fillOpacity="0.85"
        textAnchor="end"
      >
        by Houm
      </text>
    </svg>
  );
}
