// =============================================================================
// Registry de proveedores — selección por env var
// =============================================================================
//
// Para agregar un proveedor nuevo:
//   1. Crear `email-<slug>.ts` que implemente `EmailProvider`.
//   2. Importarlo y agregarlo al map de abajo.
//   3. Cambiar `EMAIL_PROVIDER=<slug>` en env.
//
// El código de negocio NO debe importar adapters específicos; debe llamar
// `notify()` desde `../index.ts`.
// =============================================================================

import type { EmailProvider, ProviderSlug } from "../types";
import { resendEmailProvider } from "./email-resend";

const EMAIL_PROVIDERS: Record<ProviderSlug, EmailProvider> = {
  resend: resendEmailProvider,
};

const DEFAULT_EMAIL_PROVIDER: ProviderSlug = "resend";

function isProviderSlug(value: string): value is ProviderSlug {
  return value in EMAIL_PROVIDERS;
}

/** Devuelve el adapter de email configurado en `EMAIL_PROVIDER` (default `resend`). */
export function getEmailProvider(): EmailProvider {
  const fromEnv = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (fromEnv && isProviderSlug(fromEnv)) {
    return EMAIL_PROVIDERS[fromEnv];
  }
  return EMAIL_PROVIDERS[DEFAULT_EMAIL_PROVIDER];
}
