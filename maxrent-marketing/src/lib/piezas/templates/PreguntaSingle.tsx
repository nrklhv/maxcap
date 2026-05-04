// =============================================================================
// Template: Pregunta-respuesta single 1080×1080
// =============================================================================
// Hook con pregunta serif gigante + 3 razones bullet con flecha decorativa.
// =============================================================================

import * as React from "react";
import type { PiezaPregunta } from "../types";
import { COLOR_ORANGE, LogoFull, SpanLine, themeFor } from "./shared";

export function PreguntaSingle({
  pieza,
  ancho,
  alto,
}: {
  pieza: PiezaPregunta;
  ancho: number;
  alto: number;
}) {
  const theme = themeFor(pieza.fondo);

  return (
    <div
      style={{
        width: ancho,
        height: alto,
        backgroundColor: theme.bg,
        color: theme.text,
        display: "flex",
        flexDirection: "column",
        padding: 80,
        fontFamily: "DM Sans",
      }}
    >
      <LogoFull textColor={theme.wordmark} />

      <div
        style={{
          display: "flex",
          fontFamily: "DM Sans",
          fontSize: 18,
          fontWeight: 500,
          letterSpacing: 5,
          textTransform: "uppercase",
          color: COLOR_ORANGE,
          marginTop: 40,
        }}
      >
        {pieza.eyebrow}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          fontFamily: "DM Serif Display",
          fontSize: 108,
          lineHeight: 0.98,
          letterSpacing: -1,
          marginTop: 16,
        }}
      >
        {pieza.headline.map((line, i) => (
          <SpanLine key={i} spans={line} theme={theme} />
        ))}
      </div>

      <div
        style={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 24,
        }}
      >
        {pieza.respuestas.map((spans, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
            <span
              style={{
                fontFamily: "DM Serif Display",
                fontSize: 56,
                lineHeight: 0.9,
                color: COLOR_ORANGE,
                display: "flex",
              }}
            >
              →
            </span>
            <SpanLine
              spans={spans}
              theme={theme}
              style={{
                fontFamily: "DM Sans",
                fontSize: 30,
                lineHeight: 1.4,
                color: theme.bajada,
              }}
            />
          </div>
        ))}
      </div>

      {pieza.footer && (
        <div
          style={{
            display: "flex",
            fontFamily: "DM Sans",
            fontSize: 14,
            fontStyle: "italic",
            color: theme.footer,
            paddingTop: 24,
          }}
        >
          {pieza.footer}
        </div>
      )}
    </div>
  );
}
