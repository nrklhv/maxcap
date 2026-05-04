// =============================================================================
// Template: Two-columns single 1080×1080
// =============================================================================
// Comparación lado a lado de NUEVA vs CLUB con N filas de stat + label.
// =============================================================================

import * as React from "react";
import type { PiezaTwoColumns } from "../types";
import { COLOR_ORANGE, LogoFull, themeFor } from "./shared";

export function TwoColumnsSingle({
  pieza,
  ancho,
  alto,
}: {
  pieza: PiezaTwoColumns;
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

      {/* Headers de columnas */}
      <div style={{ display: "flex", marginTop: 32, paddingBottom: 8 }}>
        <div
          style={{
            display: "flex",
            flex: 1,
            fontFamily: "DM Sans",
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: 3,
            color: theme.muted,
          }}
        >
          NUEVA
        </div>
        <div
          style={{
            display: "flex",
            flex: 1,
            paddingLeft: 24,
            fontFamily: "DM Sans",
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: 3,
            color: COLOR_ORANGE,
          }}
        >
          CLUB
        </div>
      </div>

      <div style={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        {pieza.filas.map((f, i) => {
          const valSize = f.valSize ?? 50;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                padding: "14px 0",
                borderBottom: `1px solid ${theme.divider}`,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingRight: 24 }}>
                <span
                  style={{
                    fontFamily: "DM Serif Display",
                    fontSize: valSize - 6,
                    lineHeight: 1,
                    color: theme.bajada,
                  }}
                >
                  {f.valNueva}
                </span>
                <span
                  style={{
                    fontFamily: "DM Sans",
                    fontSize: 16,
                    color: theme.muted,
                    marginTop: 4,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                  }}
                >
                  {f.lblNueva}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  paddingLeft: 24,
                  borderLeft: `1px solid ${theme.divider}`,
                }}
              >
                <span
                  style={{
                    fontFamily: "DM Serif Display",
                    fontSize: valSize,
                    lineHeight: 1,
                    fontStyle: "italic",
                    color: COLOR_ORANGE,
                  }}
                >
                  {f.valClub}
                </span>
                <span
                  style={{
                    fontFamily: "DM Sans",
                    fontSize: 16,
                    color: theme.text,
                    marginTop: 4,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                  }}
                >
                  {f.lblClub}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {pieza.footer && (
        <div
          style={{
            display: "flex",
            fontFamily: "DM Sans",
            fontSize: 14,
            fontStyle: "italic",
            color: theme.footer,
            paddingTop: 16,
          }}
        >
          {pieza.footer}
        </div>
      )}
    </div>
  );
}
