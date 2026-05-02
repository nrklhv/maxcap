// =============================================================================
// Template: magic-link
// =============================================================================
// Email con el link de acceso al portal sin contraseña.
// Disparado por NextAuth cuando el usuario pide login con email.
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

export type MagicLinkVariables = {
  /** URL única generada por NextAuth con el token de un solo uso. */
  url: string;
  /** Email del destinatario (informativo en el cuerpo). */
  email: string;
  /** Cuántos minutos dura el link antes de expirar (default 24h = 1440 min). */
  expiresMinutes?: number;
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
    fontSize: "22px",
    fontWeight: 600,
    margin: "0 0 16px",
    lineHeight: 1.25,
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
  rawLinkLabel: {
    color: "#7A6E68",
    fontSize: "12px",
    margin: "0 0 4px",
  },
  rawLink: {
    color: "#3A3A3A",
    fontSize: "12px",
    wordBreak: "break-all" as const,
    margin: "0 0 16px",
  },
  footer: {
    color: "#7A6E68",
    fontSize: "12px",
    lineHeight: 1.6,
    marginTop: "20px",
    paddingTop: "20px",
    borderTop: "1px solid #EDE7E0",
  },
};

function expiryLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} minutos`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hora${hours === 1 ? "" : "s"}`;
  const days = Math.round(hours / 24);
  return `${days} día${days === 1 ? "" : "s"}`;
}

export default function MagicLink({
  url,
  email,
  expiresMinutes = 24 * 60,
}: MagicLinkVariables) {
  return (
    <Html>
      <Head />
      <Preview>Tu link de acceso a MaxRent</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>Ingresa al portal MaxRent</Heading>
          <Text style={styles.paragraph}>
            Pediste un link de acceso para <strong>{email}</strong>. Toca el botón
            para entrar — no necesitas contraseña.
          </Text>
          <Section style={styles.buttonWrap}>
            <Link href={url} style={styles.button}>
              Ingresar al portal
            </Link>
          </Section>
          <Text style={styles.rawLinkLabel}>
            Si el botón no funciona, copia y pega este link en tu navegador:
          </Text>
          <Text style={styles.rawLink}>{url}</Text>
          <Text style={styles.footer}>
            Este link expira en {expiryLabel(expiresMinutes)} y solo puede usarse
            una vez. Si no fuiste tú quien lo solicitó, ignora este correo.
            <br />
            MaxRent · Inversión inmobiliaria en propiedades usadas
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

/** Plain-text fallback. */
export function magicLinkText(vars: MagicLinkVariables): string {
  const expires = expiryLabel(vars.expiresMinutes ?? 24 * 60);
  return [
    `Pediste un link de acceso a MaxRent para ${vars.email}.`,
    "",
    "Ingresa al portal abriendo este link (no requiere contraseña):",
    "",
    vars.url,
    "",
    `El link expira en ${expires} y solo puede usarse una vez.`,
    "Si no fuiste tú quien lo solicitó, ignora este correo.",
    "",
    "MaxRent",
  ].join("\n");
}

export const magicLinkSubject = "Tu link de acceso a MaxRent";
