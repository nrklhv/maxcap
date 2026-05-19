// =============================================================================
// Template: evaluacion-completada
// =============================================================================
// Email que se envía cuando los antecedentes financieros del inversionista se
// completaron correctamente. Le comunica que el equipo revisa el reporte
// antes de habilitar reservas (gate de staff). Sin información sensible del
// reporte en el email — staff la maneja en el portal interno.
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

export type EvaluacionCompletadaVariables = {
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

export default function EvaluacionCompletada({
  firstName = "",
  portalUrl,
}: EvaluacionCompletadaVariables) {
  const greeting = firstName ? `Hola ${firstName},` : "Hola,";
  return (
    <Html>
      <Head />
      <Preview>Recibimos tus antecedentes. El equipo MaxRent los revisa.</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>Recibimos tus antecedentes</Heading>
          <Text style={styles.paragraph}>{greeting}</Text>
          <Text style={styles.paragraph}>
            Tu evaluación financiera está completa. Ahora el equipo MaxRent
            revisa el reporte y te confirma cuando estés habilitado para
            reservar unidades del portafolio.
          </Text>
          <Text style={styles.paragraph}>
            Esta revisión suele tardar 1 día hábil. Te enviamos otro correo
            apenas estés habilitado.
          </Text>
          <Section style={styles.buttonWrap}>
            <Link href={`${portalUrl}/evaluacion`} style={styles.button}>
              Ver mi evaluación
            </Link>
          </Section>
          <Text style={styles.footer}>
            ¿Dudas? Responde este correo y un especialista te contacta.
            <br />
            MaxRent · Inversión inmobiliaria en propiedades usadas
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function evaluacionCompletadaText(vars: EvaluacionCompletadaVariables): string {
  const greeting = vars.firstName ? `Hola ${vars.firstName},` : "Hola,";
  return [
    greeting,
    "",
    "Tu evaluación financiera está completa. El equipo MaxRent revisa el reporte y te confirma cuando estés habilitado para reservar unidades del portafolio.",
    "",
    "Esta revisión suele tardar 1 día hábil. Te enviamos otro correo apenas estés habilitado.",
    "",
    `Ver mi evaluación: ${vars.portalUrl}/evaluacion`,
    "",
    "MaxRent",
  ].join("\n");
}

export const evaluacionCompletadaSubject = "Recibimos tus antecedentes — en revisión";
