/**
 * Metadata + mock variables de cada template para el preview de staff.
 *
 * El subject acá es solo descriptivo (informativo para staff). El subject real
 * que sale en el email vive en cada `<slug>Subject` del template y se usa al
 * renderear vía `renderTemplate()`.
 */

import type { TemplateKey, TemplateMap } from "@/lib/services/notifications/templates/_registry";

export type TemplateMetadata = {
  /** Descripción legible para staff (qué hace este email). */
  description: string;
  /** Cuándo/qué lo dispara, en lenguaje humano. */
  trigger: string;
  /** Subject reflejado del template — solo informativo, no se usa al renderear. */
  subject: string;
};

const SAMPLE_PORTAL_URL = "https://portal.maxrent.cl";

/**
 * Variables de ejemplo por template — se usan en el preview server-side.
 * Si querés ver el template con datos distintos, podés overridear vía query
 * params (`?firstName=Pedro`) — ver la ruta `[key]/page.tsx`.
 */
export const TEMPLATE_SAMPLE_VARS: {
  [K in TemplateKey]: TemplateMap[K];
} = {
  "welcome-investor": {
    firstName: "Pedro",
    email: "pedro.ejemplo@gmail.com",
    portalUrl: SAMPLE_PORTAL_URL,
  },
  "magic-link": {
    url: `${SAMPLE_PORTAL_URL}/api/auth/callback/resend?token=ABCD1234&email=pedro%40ejemplo.cl`,
    email: "pedro@ejemplo.cl",
    expiresMinutes: 30,
  },
  "perfil-completado": {
    firstName: "Pedro",
    portalUrl: SAMPLE_PORTAL_URL,
  },
  "evaluacion-completada": {
    firstName: "Pedro",
    portalUrl: SAMPLE_PORTAL_URL,
  },
  "evaluacion-fallida": {
    firstName: "Pedro",
    portalUrl: SAMPLE_PORTAL_URL,
  },
  "habilitacion-aprobada": {
    firstName: "Pedro",
    portalUrl: SAMPLE_PORTAL_URL,
  },
  "reserva-pagada": {
    firstName: "Pedro",
    unitDescription: "Departamento A-401 (Propiedades San Miguel)",
    amountClpFormatted: "$1.500.000",
    portalUrl: SAMPLE_PORTAL_URL,
  },
};

export const TEMPLATE_METADATA: Record<TemplateKey, TemplateMetadata> = {
  "welcome-investor": {
    description:
      "Bienvenida que recibe un lead al completar el form del landing.",
    trigger: "POST /api/public/leads (kind=INVESTOR)",
    subject: "Tu cupo en MaxRent está reservado",
  },
  "magic-link": {
    description:
      "Link de login sin contraseña para email/Resend en NextAuth.",
    trigger: "Login con email/magic link en /login",
    subject: "Tu acceso a MaxRent",
  },
  "perfil-completado": {
    description:
      "Confirma que el inversionista terminó el onboarding del perfil. Lo empuja al siguiente paso: evaluación financiera.",
    trigger: "PUT /api/users/profile cuando onboardingCompleted pasa false→true",
    subject: "Tu perfil está listo · próximo paso: evaluación",
  },
  "evaluacion-completada": {
    description:
      "Avisa que recibimos los antecedentes y el equipo los revisa antes de habilitar reservas.",
    trigger: "POST /api/floid/callback (status=COMPLETED)",
    subject: "Recibimos tus antecedentes — en revisión",
  },
  "evaluacion-fallida": {
    description:
      "Avisa que la evaluación no se completó y le da la opción de reintentar.",
    trigger: "POST /api/floid/callback (status=FAILED o todo vacío)",
    subject: "Tu evaluación no se completó — puedes reintentar",
  },
  "habilitacion-aprobada": {
    description:
      "El email más importante del journey: avisa que ya puede reservar unidades del portafolio.",
    trigger: "Staff aprieta 'Habilitar reservas' en /staff/inversionistas",
    subject: "Estás habilitado para reservar en MaxRent",
  },
  "reserva-pagada": {
    description:
      "Confirma el pago de la reserva, identifica la unidad reservada y anticipa el contacto del equipo para próximos pasos.",
    trigger: "Webhook Mercado Pago con status=approved",
    subject: "Pago confirmado · tu reserva quedó registrada",
  },
};
