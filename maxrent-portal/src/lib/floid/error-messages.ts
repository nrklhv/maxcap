/**
 * Traducción de error codes técnicos de Floid a mensajes legibles para el
 * inversionista. Si no hay mapeo específico, se usa el `display_message` de
 * Floid (que ya viene en español) o el `error_message` (en inglés) como
 * último recurso.
 *
 * @domain creditEvaluation
 */

import type { SectionError } from "@/lib/floid/parse-floid-response";

interface HumanError {
  /** Mensaje principal (1 oración) en lenguaje natural, en español. */
  message: string;
  /** Sugerencia accionable opcional (e.g. "Reintenta en unos minutos"). */
  hint?: string;
  /** Categoría para colorear UI o decidir si conviene reintentar automáticamente. */
  severity: "info" | "warn" | "error";
  /** True si el error es recuperable reintentando la evaluación. */
  retryable: boolean;
}

/**
 * Tabla principal de mapeo. La clave es el `error_code` que devuelve Floid.
 * Si una sección no aparece en esta tabla, se cae al fallback de `humanizeFloidError`.
 */
const ERROR_MAP: Record<string, HumanError> = {
  // --- Servicios del Estado caídos / no disponibles ---
  SERVICE_UNAVAILABLE: {
    message:
      "El servicio del Estado (SP/SII) no está respondiendo en este momento.",
    hint: "Suele volver en minutos. Vuelve a intentar más tarde.",
    severity: "warn",
    retryable: true,
  },
  SERVICE_ERROR: {
    message:
      "El servicio del Estado devolvió un error técnico al consultar tu información.",
    hint: "Reintenta en unos minutos. Si persiste, contáctanos.",
    severity: "warn",
    retryable: true,
  },
  // --- Producto no habilitado en el widget Floid ---
  METHOD_NOT_AUTH: {
    message:
      "Hay un problema técnico con esa consulta de nuestro lado.",
    hint: "Ya estamos al tanto. No hace falta que reintentes.",
    severity: "error",
    retryable: false,
  },
  // --- Credenciales / 2FA ---
  INVALID_CREDENTIALS: {
    message: "La clave ingresada no es correcta.",
    hint: "Vuelve a intentar con la clave correcta.",
    severity: "warn",
    retryable: true,
  },
  INVALID_2FA_TOKEN: {
    message: "El código de verificación no es válido o ya expiró.",
    hint:
      "Reintenta y atiende rápido el correo de Clave Única — el código tiene pocos minutos de validez.",
    severity: "warn",
    retryable: true,
  },
  TWO_FACTOR_AUTHENTICATION_TIMEOUT: {
    message:
      "El tiempo de espera del código de Clave Única se agotó.",
    hint: "Reintenta y atiende rápido el correo de Clave Única.",
    severity: "warn",
    retryable: true,
  },
  LOCKED_CREDENTIALS: {
    message:
      "Tu Clave Única quedó bloqueada por la entidad emisora (intentos previos fallidos).",
    hint: "Suele liberarse automáticamente en 24h. Mientras tanto, contáctanos.",
    severity: "error",
    retryable: false,
  },
  // --- Auth genérico ---
  AUTH_ERROR: {
    message: "No pudimos autenticar la consulta con esa fuente.",
    hint: "Reintenta. Si vuelve a fallar, contáctanos.",
    severity: "warn",
    retryable: true,
  },
};

/**
 * Convierte un SectionError técnico en algo amigable para mostrar al inversionista.
 */
export function humanizeFloidError(error: SectionError): HumanError {
  // 1) Match exacto por error_code
  if (error.errorCode) {
    const mapped = ERROR_MAP[error.errorCode];
    if (mapped) return mapped;
  }
  // 2) Match por código HTTP-like
  if (error.code === "503") {
    return {
      message: "El servicio externo no está disponible en este momento.",
      hint: "Reintenta en unos minutos.",
      severity: "warn",
      retryable: true,
    };
  }
  // 3) Fallback: usar el display_message si parece estar en español, si no algo genérico.
  const looksSpanish = /[áéíóúñ¿¡]/i.test(error.message);
  return {
    message: looksSpanish
      ? error.message
      : "No pudimos obtener esta sección del reporte.",
    hint: "Reintenta. Si vuelve a fallar, contáctanos.",
    severity: "warn",
    retryable: true,
  };
}

/**
 * Etiqueta legible de la sección de Floid, para usar en banners/UI.
 */
export function sectionLabel(section: "sp" | "sii" | "cmf"): string {
  switch (section) {
    case "sp":
      return "Renta (Superintendencia de Pensiones)";
    case "sii":
      return "Información tributaria (SII)";
    case "cmf":
      return "Deuda (CMF)";
  }
}
