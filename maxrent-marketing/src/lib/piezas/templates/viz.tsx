// =============================================================================
// Visualizaciones para piezas editoriales — HTML+CSS first (Satori-compatible)
// =============================================================================
// Satori no soporta <text> dentro de SVG. Mezclamos HTML para texto + SVG solo
// para shapes (líneas, círculos sin texto).
// =============================================================================

import * as React from "react";
import type { VizConfig } from "../types";
import { COLOR_ORANGE, COLOR_ORANGE_2, type Theme } from "./shared";

// ─────────────────────────────────────────────────────────────────────────────
// Cover · 100 dots llenos (10×10 grid de divs circulares)
// ─────────────────────────────────────────────────────────────────────────────
function VizDotsCover() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {Array.from({ length: 10 }).map((_, row) => (
        <div key={row} style={{ display: "flex", gap: 12 }}>
          {Array.from({ length: 10 }).map((_, col) => (
            <div
              key={col}
              style={{
                width: 24,
                height: 24,
                borderRadius: 999,
                backgroundColor: COLOR_ORANGE,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dots con N vacíos
// ─────────────────────────────────────────────────────────────────────────────
function VizDotsEmpty({ emptyIndices }: { emptyIndices: number[] }) {
  const empty = new Set(emptyIndices);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {Array.from({ length: 10 }).map((_, row) => (
        <div key={row} style={{ display: "flex", gap: 12 }}>
          {Array.from({ length: 10 }).map((_, col) => {
            const i = row * 10 + col;
            const isEmpty = empty.has(i);
            return (
              <div
                key={col}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 999,
                  backgroundColor: isEmpty ? "transparent" : COLOR_ORANGE,
                  border: isEmpty ? `2px solid ${COLOR_ORANGE}` : "none",
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bars 24 meses — vacancia chart
// ─────────────────────────────────────────────────────────────────────────────
function VizBars24Meses({ sinPool, theme }: { sinPool: number[]; theme: Theme }) {
  const conPool = new Array(24).fill(38);
  const barW = 14;
  const barGap = 4;

  function BarsRow({ values, accent }: { values: number[]; accent: string }) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: barGap,
          height: 100,
          borderBottom: `1px solid ${theme.divider}`,
          paddingBottom: 2,
        }}
      >
        {values.map((h, i) => {
          if (h === 0) {
            return (
              <div
                key={i}
                style={{
                  width: barW,
                  height: 80,
                  border: `1px dashed ${theme.muted}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  color: theme.muted,
                }}
              >
                ×
              </div>
            );
          }
          const op = h < 32 ? 0.55 : 0.9;
          return (
            <div
              key={i}
              style={{
                width: barW,
                height: h * 2,
                backgroundColor: accent,
                opacity: op,
              }}
            />
          );
        })}
      </div>
    );
  }

  function YearLabels() {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          marginTop: 8,
          fontSize: 14,
          color: theme.muted,
          letterSpacing: 3,
        }}
      >
        <span>AÑO 1</span>
        <span>AÑO 2</span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", width: 700 }}>
      {/* Sin pool */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          fontSize: 18,
          fontWeight: 500,
          letterSpacing: 5,
          color: theme.muted,
          marginBottom: 14,
        }}
      >
        SIN POOL · INGRESO INESTABLE
      </div>
      <BarsRow values={sinPool} accent={COLOR_ORANGE} />
      <YearLabels />

      {/* Con MaxRent */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: 5,
          color: COLOR_ORANGE,
          marginTop: 30,
          marginBottom: 14,
        }}
      >
        CON MAXRENT · INGRESO ESTABLE
      </div>
      <BarsRow values={conPool} accent={COLOR_ORANGE} />
      <YearLabels />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Radial lines (gastos prorrateados) — pure SVG, no text needed
// ─────────────────────────────────────────────────────────────────────────────
function VizRadialLines() {
  const positions: { x: number; y: number }[] = [];
  for (let r = 0; r < 10; r++)
    for (let c = 0; c < 10; c++) positions.push({ x: 10 + c * 20, y: 10 + r * 20 });
  const cx = 100;
  const cy = 100;

  return (
    <svg width="380" height="380" viewBox="0 0 200 200" style={{ display: "block" }}>
      {positions.map((p, i) => (
        <line
          key={`l${i}`}
          x1={cx}
          y1={cy}
          x2={p.x}
          y2={p.y}
          stroke={COLOR_ORANGE}
          strokeWidth="0.5"
          strokeOpacity="0.30"
        />
      ))}
      {positions.map((p, i) => (
        <circle key={`d${i}`} cx={p.x} cy={p.y} r="4" fill={COLOR_ORANGE} />
      ))}
      <circle cx={cx} cy={cy} r="6.5" fill={COLOR_ORANGE_2} />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Timeline pasos — cómo funciona
// ─────────────────────────────────────────────────────────────────────────────
function VizTimelinePasos({ activeStep, theme }: { activeStep: number; theme: Theme }) {
  const NODES = ["TE CONOCEMOS", "RESERVAS", "FIRMAMOS", "INVERSIÓN"];
  const nodeSize = 44;
  const nodeSizeActive = 64;

  function Node({ idx }: { idx: number }) {
    const isActive = idx === activeStep;
    const isDone = idx < activeStep;
    const size = isActive ? nodeSizeActive : nodeSize;
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: size,
          height: size,
          borderRadius: 999,
          backgroundColor: isActive
            ? COLOR_ORANGE
            : isDone
            ? COLOR_ORANGE_2
            : "transparent",
          border: !isActive && !isDone ? `2px solid ${theme.muted}` : "none",
          color: isActive || isDone ? theme.bg : theme.muted,
          fontSize: isActive ? 32 : 20,
          fontFamily: isActive ? "DM Serif Display" : "DM Sans",
          fontStyle: isActive ? "italic" : "normal",
          fontWeight: isActive ? 400 : 500,
          flexShrink: 0,
        }}
      >
        {idx + 1}
      </div>
    );
  }

  function Connector({ done }: { done: boolean }) {
    return (
      <div
        style={{
          flexGrow: 1,
          height: done ? 3 : 2,
          backgroundColor: done ? COLOR_ORANGE : "transparent",
          borderTop: done ? "none" : `2px dashed ${theme.divider}`,
          marginLeft: -2,
          marginRight: -2,
        }}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", width: 720 }}>
      {/* Header "PASO X DE 4" */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          fontSize: 14,
          fontWeight: 500,
          letterSpacing: 5,
          color: theme.muted,
          marginBottom: 22,
        }}
      >
        PASO {activeStep + 1} DE 4
      </div>

      {/* Nodes + connectors */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {NODES.map((_, i) => (
          <React.Fragment key={i}>
            <Node idx={i} />
            {i < NODES.length - 1 && <Connector done={i < activeStep} />}
          </React.Fragment>
        ))}
      </div>

      {/* Labels row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 18,
        }}
      >
        {NODES.map((label, i) => {
          const isActive = i === activeStep;
          return (
            <div
              key={i}
              style={{
                width: 130,
                textAlign: "center",
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                letterSpacing: 2.5,
                color: isActive ? COLOR_ORANGE : theme.muted,
                display: "flex",
                justifyContent: "center",
              }}
            >
              {label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Comparativa tabla (Nuevas vs. Usadas)
// ─────────────────────────────────────────────────────────────────────────────
function VizComparativaTabla({
  filas,
  theme,
}: {
  filas: { label: string; nueva: string; club: string }[];
  theme: Theme;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: 760 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          paddingBottom: 12,
          borderBottom: `1px solid ${theme.divider}`,
        }}
      >
        <div style={{ display: "flex", flex: 1.4 }} />
        <div
          style={{
            display: "flex",
            flex: 1,
            justifyContent: "center",
            fontSize: 18,
            fontWeight: 500,
            letterSpacing: 4,
            color: theme.muted,
          }}
        >
          NUEVA
        </div>
        <div
          style={{
            display: "flex",
            flex: 1,
            justifyContent: "center",
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: 4,
            color: COLOR_ORANGE,
          }}
        >
          CLUB
        </div>
      </div>

      {filas.map((f, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            paddingTop: 18,
            paddingBottom: 18,
            borderBottom: i < filas.length - 1 ? `1px solid ${theme.divider}` : "none",
          }}
        >
          <div
            style={{
              display: "flex",
              flex: 1.4,
              fontSize: 15,
              fontWeight: 500,
              color: theme.bajada,
              letterSpacing: 2,
            }}
          >
            {f.label}
          </div>
          <div
            style={{
              display: "flex",
              flex: 1,
              justifyContent: "center",
              fontFamily: "DM Serif Display",
              fontSize: 30,
              color: theme.bajada,
            }}
          >
            {f.nueva}
          </div>
          <div
            style={{
              display: "flex",
              flex: 1,
              justifyContent: "center",
              fontFamily: "DM Serif Display",
              fontSize: 30,
              fontStyle: "italic",
              color: COLOR_ORANGE,
            }}
          >
            {f.club}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TIR bars
// ─────────────────────────────────────────────────────────────────────────────
function VizTirBars({
  nueva,
  club,
  max,
  theme,
}: {
  nueva: number;
  club: number;
  max: number;
  theme: Theme;
}) {
  const totalW = 540;
  const w1 = (nueva / max) * (totalW - 80);
  const w2 = (club / max) * (totalW - 80);

  return (
    <div style={{ display: "flex", flexDirection: "column", width: totalW }}>
      {/* Nueva */}
      <div
        style={{
          display: "flex",
          fontSize: 16,
          fontWeight: 500,
          letterSpacing: 4,
          color: theme.muted,
        }}
      >
        NUEVA
      </div>
      <div style={{ display: "flex", alignItems: "center", marginTop: 8 }}>
        <div
          style={{
            width: w1,
            height: 32,
            backgroundColor: theme.bajada,
            opacity: 0.4,
          }}
        />
        <span
          style={{
            marginLeft: 14,
            fontFamily: "DM Serif Display",
            fontSize: 32,
            color: theme.text,
          }}
        >
          {nueva.toString().replace(".", ",")}%
        </span>
      </div>

      {/* Club */}
      <div
        style={{
          display: "flex",
          fontSize: 16,
          fontWeight: 600,
          letterSpacing: 4,
          color: COLOR_ORANGE,
          marginTop: 28,
        }}
      >
        CLUB
      </div>
      <div style={{ display: "flex", alignItems: "center", marginTop: 8 }}>
        <div style={{ width: w2, height: 32, backgroundColor: COLOR_ORANGE }} />
        <span
          style={{
            marginLeft: 14,
            fontFamily: "DM Serif Display",
            fontSize: 32,
            fontStyle: "italic",
            color: COLOR_ORANGE,
          }}
        >
          {club.toString().replace(".", ",")}%
        </span>
      </div>

      {/* Diferencia */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 28,
          paddingTop: 16,
          borderTop: `1px solid ${theme.divider}`,
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 500,
            letterSpacing: 3,
            color: theme.muted,
          }}
        >
          DIFERENCIA
        </span>
        <span
          style={{
            fontFamily: "DM Serif Display",
            fontSize: 26,
            fontStyle: "italic",
            color: COLOR_ORANGE,
          }}
        >
          +{(club - nueva).toFixed(1).replace(".", ",")} pts
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Día 1 vs Mes 37 timeline
// ─────────────────────────────────────────────────────────────────────────────
function VizDia1VsMes37({ theme }: { theme: Theme }) {
  const totalW = 640;
  const xMes37 = Math.round((37 / 48) * totalW);
  // 5 ticks at 0, 1/4, 2/4, 3/4, 1 of totalW
  const tickXs = [0, 0.25, 0.5, 0.75, 1].map((p) => Math.round(p * totalW));

  return (
    <div style={{ display: "flex", flexDirection: "column", width: totalW }}>
      {/* CLUB · DÍA 1 (arriba a la izquierda) */}
      <div style={{ display: "flex", marginBottom: 14 }}>
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: 3,
            color: COLOR_ORANGE,
          }}
        >
          CLUB · DÍA 1
        </span>
      </div>

      {/* Timeline area (relative container, no flex) */}
      <div style={{ position: "relative", width: totalW, height: 50, display: "flex" }}>
        {/* Línea horizontal */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 24,
            width: totalW,
            height: 2,
            backgroundColor: theme.divider,
          }}
        />
        {/* 5 ticks */}
        {tickXs.map((x, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - 1,
              top: 18,
              width: 2,
              height: 14,
              backgroundColor: theme.muted,
            }}
          />
        ))}
        {/* Marker CLUB (extremo izq) */}
        <div
          style={{
            position: "absolute",
            left: -12,
            top: 13,
            width: 24,
            height: 24,
            borderRadius: 999,
            backgroundColor: COLOR_ORANGE,
            display: "flex",
          }}
        />
        {/* Marker NUEVA (mes 37) */}
        <div
          style={{
            position: "absolute",
            left: xMes37 - 10,
            top: 15,
            width: 20,
            height: 20,
            borderRadius: 999,
            border: `2px solid ${theme.muted}`,
            backgroundColor: theme.bg,
            display: "flex",
          }}
        />
      </div>

      {/* Labels meses (debajo de la línea) */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 10,
          fontSize: 12,
          color: theme.muted,
          letterSpacing: 1,
        }}
      >
        <span>m0</span>
        <span>m12</span>
        <span>m24</span>
        <span>m36</span>
        <span>m48</span>
      </div>

      {/* NUEVA · MES 37 (debajo a la derecha) */}
      <div
        style={{
          position: "relative",
          width: totalW,
          height: 24,
          marginTop: 14,
          display: "flex",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: xMes37 - 60,
            top: 0,
            display: "flex",
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: 3,
              color: theme.muted,
            }}
          >
            NUEVA · MES 37
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Renderer principal — selecciona viz según config
// ─────────────────────────────────────────────────────────────────────────────
export function renderViz(config: VizConfig, theme: Theme): React.ReactElement {
  switch (config.type) {
    case "dots-cover":
      return <VizDotsCover />;
    case "dots-empty":
      return <VizDotsEmpty emptyIndices={config.emptyIndices} />;
    case "bars-24-meses":
      return <VizBars24Meses sinPool={config.sinPool} theme={theme} />;
    case "radial-lines":
      return <VizRadialLines />;
    case "timeline-pasos":
      return <VizTimelinePasos activeStep={config.activeStep} theme={theme} />;
    case "comparativa-tabla":
      return <VizComparativaTabla filas={config.filas} theme={theme} />;
    case "tir-bars":
      return <VizTirBars nueva={config.nueva} club={config.club} max={config.max} theme={theme} />;
    case "dia1-vs-mes37":
      return <VizDia1VsMes37 theme={theme} />;
  }
}
