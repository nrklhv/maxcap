// =============================================================================
// Template: reserva-pagada
// =============================================================================
// Email que se envía cuando el inversionista paga su reserva (webhook Mercado
// Pago marca status=PAID). Confirma el monto pagado, identifica la unidad
// reservada, y anticipa los próximos pasos (escrituración + el equipo se
// contacta).
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

export type ReservaPagadaVariables = {
  firstName?: string;
  /** Descripción legible de la unidad (ej. "Unidad B-302 · Propiedades San Miguel"). */
  unitDescription: string;
  /** Monto pagado en CLP, ya formateado para mostrar (ej. "$1.500.000"). */
  amountClpFormatted: string;
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
  detailBox: {
    border: "1px solid #EDE7E0",
    borderRadius: "8px",
    padding: "16px",
    margin: "20px 0",
    backgroundColor: "#FBF7F3",
  },
  detailRow: {
    margin: "4px 0",
    fontSize: "14px",
    color: "#3A3A3A",
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

export default function ReservaPagada({
  firstName = "",
  unitDescription,
  amountClpFormatted,
  portalUrl,
}: ReservaPagadaVariables) {
  const greeting = firstName ? `Hola ${firstName},` : "Hola,";
  return (
    <Html>
      <Head />
      <Preview>
        Pago confirmado. Tu reserva de {unitDescription} quedó registrada.
      </Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>Pago confirmado</Heading>
          <Text style={styles.paragraph}>{greeting}</Text>
          <Text style={styles.paragraph}>
            Recibimos tu pago de reserva. Esta unidad queda comprometida a tu
            nombre mientras avanzamos con la escrituración.
          </Text>
          <Section style={styles.detailBox}>
            <Text style={styles.detailRow}>
              <strong>Unidad:</strong> {unitDescription}
            </Text>
            <Text style={styles.detailRow}>
              <strong>Monto pagado:</strong> {amountClpFormatted} CLP
            </Text>
          </Section>
          <Text style={styles.paragraph}>
            Un especialista te contacta en las próximas 48 horas hábiles para
            coordinar los pasos siguientes (firma de promesa, escrituración,
            etc.). El monto pagado es imputable al precio total de compra.
          </Text>
          <Section style={styles.buttonWrap}>
            <Link href={`${portalUrl}/reserva`} style={styles.button}>
              Ver mi reserva
            </Link>
          </Section>
          <Text style={styles.footer}>
            ¿Dudas? Responde este correo y un especialista te ayuda.
            <br />
            MaxRent · Inversión inmobiliaria en propiedades usadas
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function reservaPagadaText(vars: ReservaPagadaVariables): string {
  const greeting = vars.firstName ? `Hola ${vars.firstName},` : "Hola,";
  return [
    greeting,
    "",
    "Recibimos tu pago de reserva. Esta unidad queda comprometida a tu nombre mientras avanzamos con la escrituración.",
    "",
    `Unidad: ${vars.unitDescription}`,
    `Monto pagado: ${vars.amountClpFormatted} CLP`,
    "",
    "Un especialista te contacta en las próximas 48 horas hábiles para coordinar los pasos siguientes. El monto pagado es imputable al precio total de compra.",
    "",
    `Ver mi reserva: ${vars.portalUrl}/reserva`,
    "",
    "MaxRent",
  ].join("\n");
}

export const reservaPagadaSubject = "Pago confirmado · tu reserva quedó registrada";
