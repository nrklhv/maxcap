// =============================================================================
// Template: evaluacion-fallida
// =============================================================================
// Email que se envía cuando la evaluación financiera no se completó (timeout
// del widget, error del proveedor, etc.). Invita al usuario a reintentar sin
// fricción. NO incluimos el error técnico crudo — el usuario solo necesita
// saber que puede reintentar.
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

export type EvaluacionFallidaVariables = {
  firstName?: string;
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
  buttonWrap: { margin: "26px 0", textAlign: "center" as const },
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

export default function EvaluacionFallida({
  firstName = "",
  portalUrl,
}: EvaluacionFallidaVariables) {
  const greeting = firstName ? `Hola ${firstName},` : "Hola,";
  return (
    <Html>
      <Head />
      <Preview>No pudimos completar tu evaluación. Puedes reintentarla.</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>
            No pudimos completar tu evaluación
          </Heading>
          <Text style={styles.paragraph}>{greeting}</Text>
          <Text style={styles.paragraph}>
            Tu evaluación financiera no se completó esta vez. Puede haber sido
            un problema temporal con las claves o el proveedor. Reintentarla es
            gratis y toma pocos minutos.
          </Text>
          <Section style={styles.buttonWrap}>
            <Link href={`${portalUrl}/evaluacion`} style={styles.button}>
              Reintentar evaluación
            </Link>
          </Section>
          <Text style={styles.paragraph}>
            Si persiste el problema, responde este correo y un especialista te
            ayuda a destrabarlo.
          </Text>
          <Text style={styles.footer}>
            MaxRent · Inversión inmobiliaria en propiedades usadas
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function evaluacionFallidaText(vars: EvaluacionFallidaVariables): string {
  const greeting = vars.firstName ? `Hola ${vars.firstName},` : "Hola,";
  return [
    greeting,
    "",
    "Tu evaluación financiera no se completó esta vez. Puede haber sido un problema temporal con las claves o el proveedor. Reintentarla es gratis y toma pocos minutos.",
    "",
    `Reintentar: ${vars.portalUrl}/evaluacion`,
    "",
    "Si persiste el problema, responde este correo y un especialista te ayuda a destrabarlo.",
    "",
    "MaxRent",
  ].join("\n");
}

export const evaluacionFallidaSubject = "Tu evaluación no se completó — puedes reintentar";
