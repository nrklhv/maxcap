// =============================================================================
// Template: habilitacion-aprobada
// =============================================================================
// Email que se envía cuando staff aprieta "Habilitar reservas" para el
// inversionista (gate post-evaluación). Le avisa que ya puede reservar y lo
// invita a `/oportunidades`. Este es probablemente el email más importante
// del journey: marca el momento en que el cliente está listo para comprar.
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

export type HabilitacionAprobadaVariables = {
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

export default function HabilitacionAprobada({
  firstName = "",
  portalUrl,
}: HabilitacionAprobadaVariables) {
  const greeting = firstName ? `Hola ${firstName},` : "Hola,";
  return (
    <Html>
      <Head />
      <Preview>Ya puedes reservar unidades del portafolio MaxRent.</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>Estás habilitado para reservar</Heading>
          <Text style={styles.paragraph}>{greeting}</Text>
          <Text style={styles.paragraph}>
            Revisamos tus antecedentes financieros y todo está en orden. Ya
            puedes reservar las unidades disponibles del portafolio MaxRent.
          </Text>
          <Section style={styles.buttonWrap}>
            <Link href={`${portalUrl}/oportunidades`} style={styles.button}>
              Ver oportunidades
            </Link>
          </Section>
          <Text style={styles.paragraph}>
            La reserva se paga online vía Mercado Pago y queda imputable al
            precio de compra. Cualquier consulta, un especialista te acompaña
            por correo o llamada.
          </Text>
          <Text style={styles.footer}>
            MaxRent · Inversión inmobiliaria en propiedades usadas
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function habilitacionAprobadaText(vars: HabilitacionAprobadaVariables): string {
  const greeting = vars.firstName ? `Hola ${vars.firstName},` : "Hola,";
  return [
    greeting,
    "",
    "Revisamos tus antecedentes financieros y todo está en orden. Ya puedes reservar las unidades disponibles del portafolio MaxRent.",
    "",
    `Ver oportunidades: ${vars.portalUrl}/oportunidades`,
    "",
    "La reserva se paga online vía Mercado Pago y queda imputable al precio de compra.",
    "",
    "MaxRent",
  ].join("\n");
}

export const habilitacionAprobadaSubject = "Estás habilitado para reservar en MaxRent";
