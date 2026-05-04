// =============================================================================
// Template: Editorial single 1080×1080
// =============================================================================
// Layout:
//   - Logo MaxRent by Houm (chevrones + wordmark + endoso)
//   - Eyebrow uppercase orange (opcional)
//   - Headline serif gigante (opcional)
//   - Visualización SVG (opcional, según vizConfig)
//   - Bajada DM Sans con highlights (opcional)
//   - Footer pequeño italic muted (opcional, ej. disclaimer)
// =============================================================================

import * as React from "react";
import type { PiezaEditorial } from "../types";
import {
  COLOR_ORANGE,
  LogoFull,
  SpanLine,
  themeFor,
} from "./shared";
import { renderViz } from "./viz";

export function EditorialSingle({
  pieza,
  ancho,
  alto,
}: {
  pieza: PiezaEditorial;
  ancho: number;
  alto: number;
}) {
  const theme = themeFor(pieza.fondo);
  const headlineSize = pieza.headlineSize ?? 108;

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

      {pieza.eyebrow && (
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
      )}

      {pieza.headline && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontFamily: "DM Serif Display",
            fontSize: headlineSize,
            lineHeight: 0.98,
            letterSpacing: -1,
            marginTop: 16,
          }}
        >
          {pieza.headline.map((line, i) => (
            <SpanLine key={i} spans={line} theme={theme} />
          ))}
        </div>
      )}

      {pieza.viz ? (
        <div
          style={{
            flexGrow: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 24,
            minHeight: 0,
          }}
        >
          {renderViz(pieza.viz, theme)}
        </div>
      ) : (
        <div style={{ flexGrow: 1, display: "flex" }} />
      )}

      {pieza.bajada && (
        <SpanLine
          spans={pieza.bajada}
          theme={theme}
          style={{
            fontFamily: "DM Sans",
            fontSize: 26,
            fontWeight: 400,
            lineHeight: 1.45,
            color: theme.bajada,
            maxWidth: 880,
            paddingTop: 24,
          }}
        />
      )}

      {pieza.footer && (
        <div
          style={{
            display: "flex",
            fontFamily: "DM Sans",
            fontSize: 14,
            fontStyle: "italic",
            color: theme.footer,
            paddingTop: 14,
            maxWidth: 880,
          }}
        >
          {pieza.footer}
        </div>
      )}
    </div>
  );
}
