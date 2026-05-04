// =============================================================================
// Template: Pilar single (1080x1080) — pieza tipo "pilar"
// =============================================================================
// Renderizado por next/og (Satori). Restricciones:
//   - Layout solo flexbox
//   - Cada div con >1 hijo necesita display:flex explícito
//   - Solo subset de CSS (sin grid, sin float, sin transforms complejas)
//   - Imágenes deben venir embedded o por URL https://
// =============================================================================

import type { PiezaPilar } from "../types";

const COLOR_BG = "#001F30";
const COLOR_CREMA = "#EDE0CC";
const COLOR_ORANGE = "#FF6701";
const COLOR_ORANGE_2 = "#CC4A28";

export function PilarSingle({
  pieza,
  ancho,
  alto,
}: {
  pieza: PiezaPilar;
  ancho: number;
  alto: number;
}) {
  return (
    <div
      style={{
        width: ancho,
        height: alto,
        backgroundColor: COLOR_BG,
        color: COLOR_CREMA,
        display: "flex",
        flexDirection: "column",
        padding: 80,
        fontFamily: "DM Sans",
      }}
    >
      {/* Header: chevrones + wordmark MAXRENT */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <ChevronesIcono size={40} />
        <span
          style={{
            fontFamily: "DM Sans",
            fontSize: 28,
            fontWeight: 300,
            letterSpacing: 4,
            color: COLOR_CREMA,
            marginLeft: 14,
          }}
        >
          MAXRENT
        </span>
      </div>

      {/* Eyebrow: línea naranja + label "PILAR 0X" */}
      <div style={{ display: "flex", alignItems: "center", marginTop: 90 }}>
        <div style={{ width: 60, height: 2, backgroundColor: COLOR_ORANGE }} />
        <span
          style={{
            fontFamily: "DM Sans",
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: 5,
            color: COLOR_ORANGE,
            marginLeft: 16,
            textTransform: "uppercase",
          }}
        >
          Pilar {pieza.numero}
        </span>
      </div>

      {/* Headline serif */}
      <div
        style={{
          fontFamily: "DM Serif Display",
          fontSize: 68,
          lineHeight: 1.1,
          marginTop: 32,
          color: COLOR_CREMA,
          maxWidth: 880,
          letterSpacing: -1,
        }}
      >
        {pieza.headline}
      </div>

      {/* Stat hero — el elemento dominante */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          marginTop: 50,
        }}
      >
        <div
          style={{
            fontFamily: "DM Serif Display",
            fontSize: 240,
            lineHeight: 1,
            color: COLOR_ORANGE,
            letterSpacing: -4,
          }}
        >
          {pieza.stat}
        </div>
        <div
          style={{
            fontFamily: "DM Sans",
            fontSize: 22,
            fontWeight: 400,
            letterSpacing: 3,
            marginTop: 14,
            color: COLOR_CREMA,
            opacity: 0.7,
            textTransform: "uppercase",
          }}
        >
          {pieza.statLabel}
        </div>
      </div>

      {/* Bajada + footer (anclados al fondo) */}
      <div
        style={{
          marginTop: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            fontFamily: "DM Sans",
            fontSize: 26,
            fontWeight: 400,
            lineHeight: 1.45,
            color: COLOR_CREMA,
            opacity: 0.85,
            maxWidth: 880,
          }}
        >
          {pieza.bajada}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginTop: 50,
            paddingTop: 28,
            borderTop: "1px solid rgba(237, 224, 204, 0.18)",
            fontFamily: "DM Sans",
            fontSize: 20,
            color: COLOR_CREMA,
            opacity: 0.55,
            letterSpacing: 1.2,
          }}
        >
          Club de 100 inversionistas calificados
        </div>
      </div>
    </div>
  );
}

function ChevronesIcono({ size = 40 }: { size?: number }) {
  // viewBox 35×30 — solo los chevrones (3,3) → (31.5,26)
  return (
    <svg
      width={Math.round(size * (35 / 30))}
      height={size}
      viewBox="0 0 35 30"
      style={{ display: "flex" }}
    >
      <polyline
        points="18.5,3 3,14.5 18.5,26"
        stroke={COLOR_ORANGE}
        strokeWidth="3"
        strokeLinecap="square"
        fill="none"
      />
      <polyline
        points="31.5,3 16,14.5 31.5,26"
        stroke={COLOR_ORANGE_2}
        strokeWidth="3"
        strokeLinecap="square"
        fill="none"
      />
    </svg>
  );
}
