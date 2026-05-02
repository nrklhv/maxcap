// =============================================================================
// Template: welcome-investor
// =============================================================================
// Email de bienvenida que se envía al inversionista justo después de
// completar el form del landing.
//
// Reglas:
//  - Subject corto y específico (mejor open rate).
//  - CTA claro al portal con el email pre-cargado.
//  - Texto de fallback (sin HTML) para clientes que no renderizan.
// =============================================================================

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export type WelcomeInvestorVariables = {
  /** Nombre del inversionista (puede venir vacío si el lead no lo dejó). */
  firstName?: string;
  /** Email para pre-rellenar el login del portal. */
  email: string;
  /** Base URL del portal. Se inyecta server-side, no se asume. */
  portalUrl: string;
};

const styles = {
  body: {
    backgroundColor: "#FBF7F3",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
    margin: 0,
    padding: 0,
  },
  container: {
    maxWidth: "560px",
    margin: "0 auto",
    backgroundColor: "#FFFFFF",
    padding: "32px",
    borderRadius: "12px",
    border: "1px solid #EDE7E0",
  },
  heading: {
    color: "#001F30",
    fontSize: "24px",
    fontWeight: 600,
    margin: "0 0 16px",
    lineHeight: 1.2,
  },
  paragraph: {
    color: "#3A3A3A",
    fontSize: "16px",
    lineHeight: 1.55,
    margin: "0 0 14px",
  },
  buttonWrap: {
    margin: "26px 0",
    textAlign: "center" as const,
  },
  button: {
    display: "inline-block",
    backgroundColor: "#FF6701",
    color: "#FFFFFF",
    fontSize: "16px",
    fontWeight: 600,
    textDecoration: "none",
    padding: "12px 28px",
    borderRadius: "8px",
  },
  footer: {
    color: "#7A6E68",
    fontSize: "12px",
    lineHeight: 1.6,
    marginTop: "28px",
    paddingTop: "20px",
    borderTop: "1px solid #EDE7E0",
  },
};

/**
 * Componente del email. Exportado como default para preview con
 * `react-email dev` (cuando se sume la CLI en devDeps).
 */
export default function WelcomeInvestor({
  firstName = "",
  email,
  portalUrl,
}: WelcomeInvestorVariables) {
  const greeting = firstName ? `Hola ${firstName},` : "Hola,";
  const loginUrl = `${portalUrl}/login?email=${encodeURIComponent(
    email
  )}&newLead=1&callbackUrl=/perfil`;

  return (
    <Html>
      <Head />
      <Preview>Tu cupo en MaxRent está reservado. Continúa en el portal.</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>
            Recibimos tus datos en MaxRent
          </Heading>
          <Text style={styles.paragraph}>{greeting}</Text>
          <Text style={styles.paragraph}>
            Gracias por tu interés en invertir con MaxRent. Para continuar el
            proceso, ingresa al portal del inversionista y completa tu perfil.
            Toma menos de 2 minutos.
          </Text>
          <Section style={styles.buttonWrap}>
            <Link href={loginUrl} style={styles.button}>
              Ingresar al portal
            </Link>
          </Section>
          <Text style={styles.paragraph}>
            Una vez que completes tu perfil, un especialista se contactará en
            menos de 24 horas para acompañarte en la asesoría financiera y la
            evaluación crediticia.
          </Text>
          <Text style={styles.footer}>
            Si no fuiste tú quien dejó tus datos, ignora este correo.
            <br />
            MaxRent · Inversión inmobiliaria en propiedades usadas
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

/** Plain-text fallback (clients que no renderizan HTML). */
export function welcomeInvestorText(vars: WelcomeInvestorVariables): string {
  const greeting = vars.firstName ? `Hola ${vars.firstName},` : "Hola,";
  const loginUrl = `${vars.portalUrl}/login?email=${encodeURIComponent(
    vars.email
  )}&newLead=1&callbackUrl=/perfil`;
  return [
    greeting,
    "",
    "Gracias por tu interés en invertir con MaxRent. Para continuar el proceso, ingresa al portal del inversionista y completa tu perfil:",
    "",
    loginUrl,
    "",
    "Una vez que completes tu perfil, un especialista se contactará en menos de 24 horas.",
    "",
    "Si no fuiste tú quien dejó tus datos, ignora este correo.",
    "MaxRent",
  ].join("\n");
}

/** Subject line — vive con el template para que un cambio sea atómico. */
export const welcomeInvestorSubject = "Tu cupo en MaxRent está reservado";
