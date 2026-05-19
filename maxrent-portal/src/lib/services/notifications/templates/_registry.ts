// =============================================================================
// Registry de templates — mapa templateKey → render
// =============================================================================
//
// Para agregar un template nuevo:
//   1. Crear `<slug>.tsx` con el componente JSX (react-email).
//   2. Exportar (a) componente default, (b) `<slug>Subject`, (c) `<slug>Text`.
//   3. Agregar entrada en TEMPLATE_REGISTRY abajo.
//   4. Agregar el slug al type `TemplateKey`.
//
// Validación: los tipos garantizan que el slug existe y que las variables
// que se pasan al `notifyTemplate()` son las correctas para ese template.
// =============================================================================

import { render } from "@react-email/render";
import { createElement } from "react";
import MagicLink, {
  magicLinkSubject,
  magicLinkText,
  type MagicLinkVariables,
} from "./magic-link";
import WelcomeInvestor, {
  welcomeInvestorSubject,
  welcomeInvestorText,
  type WelcomeInvestorVariables,
} from "./welcome-investor";
import PerfilCompletado, {
  perfilCompletadoSubject,
  perfilCompletadoText,
  type PerfilCompletadoVariables,
} from "./perfil-completado";
import EvaluacionCompletada, {
  evaluacionCompletadaSubject,
  evaluacionCompletadaText,
  type EvaluacionCompletadaVariables,
} from "./evaluacion-completada";
import EvaluacionFallida, {
  evaluacionFallidaSubject,
  evaluacionFallidaText,
  type EvaluacionFallidaVariables,
} from "./evaluacion-fallida";
import HabilitacionAprobada, {
  habilitacionAprobadaSubject,
  habilitacionAprobadaText,
  type HabilitacionAprobadaVariables,
} from "./habilitacion-aprobada";
import ReservaPagada, {
  reservaPagadaSubject,
  reservaPagadaText,
  type ReservaPagadaVariables,
} from "./reserva-pagada";

/** Output común de cualquier template renderizado. */
export type RenderedTemplate = {
  subject: string;
  html: string;
  text?: string;
};

/** Map templateKey → variables type. Crece a medida que sumamos templates. */
export type TemplateMap = {
  "welcome-investor": WelcomeInvestorVariables;
  "magic-link": MagicLinkVariables;
  "perfil-completado": PerfilCompletadoVariables;
  "evaluacion-completada": EvaluacionCompletadaVariables;
  "evaluacion-fallida": EvaluacionFallidaVariables;
  "habilitacion-aprobada": HabilitacionAprobadaVariables;
  "reserva-pagada": ReservaPagadaVariables;
};

export type TemplateKey = keyof TemplateMap;

/** Mapa privado con el render de cada template. */
const TEMPLATE_REGISTRY: {
  [K in TemplateKey]: (vars: TemplateMap[K]) => Promise<RenderedTemplate>;
} = {
  "welcome-investor": async (vars) => {
    const html = await render(createElement(WelcomeInvestor, vars));
    return {
      subject: welcomeInvestorSubject,
      html,
      text: welcomeInvestorText(vars),
    };
  },
  "magic-link": async (vars) => {
    const html = await render(createElement(MagicLink, vars));
    return {
      subject: magicLinkSubject,
      html,
      text: magicLinkText(vars),
    };
  },
  "perfil-completado": async (vars) => {
    const html = await render(createElement(PerfilCompletado, vars));
    return {
      subject: perfilCompletadoSubject,
      html,
      text: perfilCompletadoText(vars),
    };
  },
  "evaluacion-completada": async (vars) => {
    const html = await render(createElement(EvaluacionCompletada, vars));
    return {
      subject: evaluacionCompletadaSubject,
      html,
      text: evaluacionCompletadaText(vars),
    };
  },
  "evaluacion-fallida": async (vars) => {
    const html = await render(createElement(EvaluacionFallida, vars));
    return {
      subject: evaluacionFallidaSubject,
      html,
      text: evaluacionFallidaText(vars),
    };
  },
  "habilitacion-aprobada": async (vars) => {
    const html = await render(createElement(HabilitacionAprobada, vars));
    return {
      subject: habilitacionAprobadaSubject,
      html,
      text: habilitacionAprobadaText(vars),
    };
  },
  "reserva-pagada": async (vars) => {
    const html = await render(createElement(ReservaPagada, vars));
    return {
      subject: reservaPagadaSubject,
      html,
      text: reservaPagadaText(vars),
    };
  },
};

/** Renderiza un template a HTML/subject/text. Throws si el slug no existe. */
export async function renderTemplate<K extends TemplateKey>(
  key: K,
  vars: TemplateMap[K]
): Promise<RenderedTemplate> {
  const renderer = TEMPLATE_REGISTRY[key];
  if (!renderer) {
    throw new Error(`Template no registrado: ${String(key)}`);
  }
  return renderer(vars);
}
