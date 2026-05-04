// =============================================================================
// Shared helpers para templates Satori
// =============================================================================

import * as React from "react";
import type { Span, SpanStyle } from "../types";

export const COLOR_DARK = "#001F30";
export const COLOR_CREAM = "#FBF7F3";
export const COLOR_CREMA = "#EDE0CC";
export const COLOR_ORANGE = "#FF6701";
export const COLOR_ORANGE_2 = "#CC4A28";

export type Theme = {
  bg: string;
  text: string;
  muted: string;
  bajada: string;
  footer: string;
  divider: string;
  wordmark: string;
};

export function themeFor(fondo: "dark" | "cream"): Theme {
  if (fondo === "dark") {
    return {
      bg: COLOR_DARK,
      text: COLOR_CREMA,
      muted: "rgba(237,224,204,0.55)",
      bajada: "rgba(237,224,204,0.85)",
      footer: "rgba(237,224,204,0.50)",
      divider: "rgba(237,224,204,0.18)",
      wordmark: COLOR_CREMA,
    };
  }
  return {
    bg: COLOR_CREAM,
    text: COLOR_DARK,
    muted: "rgba(0,31,48,0.55)",
    bajada: "rgba(0,31,48,0.80)",
    footer: "rgba(0,31,48,0.55)",
    divider: "rgba(0,31,48,0.15)",
    wordmark: COLOR_DARK,
  };
}

export function spanStyleCss(style: SpanStyle | undefined, theme: Theme): React.CSSProperties {
  switch (style) {
    case "italic-orange":
      return { fontStyle: "italic", color: COLOR_ORANGE };
    case "italic":
      return { fontStyle: "italic" };
    case "orange-medium":
      return { color: COLOR_ORANGE, fontWeight: 500 };
    case "orange":
      return { color: COLOR_ORANGE };
    case "muted-italic":
      return { fontStyle: "italic", color: theme.muted };
    default:
      return {};
  }
}

/** Logo completo MaxRent by Houm — chevrones SVG + texto HTML.
 *  Satori no soporta <text> dentro de SVG, así que el wordmark va como divs. */
export function LogoFull({ textColor }: { textColor: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
      <svg width={70} height={56} viewBox="0 0 35 30" style={{ display: "block" }}>
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
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", marginTop: 4 }}>
        <div
          style={{
            fontFamily: "DM Sans",
            fontSize: 32,
            fontWeight: 300,
            letterSpacing: 5,
            color: textColor,
            lineHeight: 1,
          }}
        >
          MAXRENT
        </div>
        <div
          style={{
            fontFamily: "DM Serif Display",
            fontSize: 18,
            fontStyle: "italic",
            fontWeight: 400,
            color: textColor,
            opacity: 0.85,
            marginTop: 2,
          }}
        >
          by Houm
        </div>
      </div>
    </div>
  );
}

/** Renderiza una línea de spans inline (usada en headline + bajada).
 *  Satori requiere display:flex en divs con varios children. Los spans con
 *  whiteSpace:pre-wrap preservan los espacios trailing/leading. */
export function SpanLine({
  spans,
  theme,
  style,
}: {
  spans: Span[];
  theme: Theme;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        ...(style || {}),
      }}
    >
      {spans.map((s, i) => (
        <span
          key={i}
          style={{ whiteSpace: "pre-wrap", ...spanStyleCss(s.style, theme) }}
        >
          {s.text}
        </span>
      ))}
    </div>
  );
}
