// =============================================================================
// Login UI (client) — usado dentro de Suspense en page.tsx
// =============================================================================

"use client";

import { signIn, getProviders } from "next-auth/react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";

type LoginContentProps = {
  /** Si no hay `callbackUrl` en la query, se usa este valor */
  defaultCallbackUrl?: string;
  heading?: string;
  subtitle?: string;
  /** Mensaje desde la página server (p. ej. error de OAuth en query) */
  serverError?: string | null;
};

/** Deriva el copy de la pantalla de login según el callbackUrl al que va a
 *  redirigir post-auth. El header del landing tiene dos puertas explícitas
 *  (Portal inversionista / Portal broker) y la pantalla de login debe
 *  reflejar visualmente cuál es la que el usuario eligió. */
function deriveLoginContext(callbackUrl: string): {
  heading: string;
  subtitle: string;
} {
  if (callbackUrl.startsWith("/broker")) {
    return {
      heading: "Portal Broker",
      subtitle: "Ingresa al portal broker MaxRent",
    };
  }
  if (callbackUrl.startsWith("/staff")) {
    return {
      heading: "Acceso Staff",
      subtitle: "Acceso interno MaxRent",
    };
  }
  return {
    heading: "Portal Inversionista",
    subtitle: "Ingresa al portal MaxRent",
  };
}

export default function LoginContent({
  defaultCallbackUrl = "/dashboard",
  heading: headingProp,
  subtitle: subtitleProp,
  serverError = null,
}: LoginContentProps = {}) {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || defaultCallbackUrl;
  const errorCode = searchParams.get("error");
  const prefillEmail = searchParams.get("email")?.trim().toLowerCase() ?? "";
  const isNewLead = searchParams.get("newLead") === "1";

  // Si el caller explícito no pasó heading/subtitle, derivamos del callbackUrl
  // para que la pantalla refleje cuál puerta del header eligió el usuario.
  const ctx = deriveLoginContext(callbackUrl);
  const heading = headingProp ?? ctx.heading;
  const subtitle = subtitleProp ?? ctx.subtitle;
  const [email, setEmail] = useState(prefillEmail);
  const [devEmail, setDevEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [devLoading, setDevLoading] = useState(false);
  const [providerIds, setProviderIds] = useState<string[] | null>(null);

  // Mensaje para errores de Auth.js en el query string. AccessDenied =
  // signIn() retornó false (típicamente por whitelist beta).
  const authErrorMessage = errorCode
    ? errorCode === "AccessDenied"
      ? "Tu correo no está autorizado para acceder al portal en este momento. Si crees que deberías tener acceso, contáctanos."
      : "No pudimos iniciar sesión. Vuelve a intentar."
    : null;

  useEffect(() => {
    getProviders().then((p) => {
      setProviderIds(p ? Object.keys(p) : []);
    });
  }, []);

  const hasGoogle = providerIds?.includes("google");
  const hasResend = providerIds?.includes("resend");
  const hasDevCredentials = providerIds?.includes("dev-credentials");

  const handleGoogleLogin = () => {
    // Si llega del landing con email pre-cargado, pasamos `login_hint` como
    // authorization param para que Google preseleccione esa cuenta y el
    // flujo se reduzca a 1 click.
    const authorizationParams = prefillEmail ? { login_hint: prefillEmail } : undefined;
    signIn("google", { callbackUrl }, authorizationParams);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      await signIn("resend", {
        email,
        callbackUrl,
        redirect: false,
      });
      setEmailSent(true);
    } catch {
      // Error handling
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!devEmail) return;
    setDevLoading(true);
    try {
      await signIn("dev-credentials", {
        email: devEmail,
        callbackUrl,
      });
    } finally {
      setDevLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10 bg-cream">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Link
            href="/"
            className="mx-auto mb-6 inline-block transition-opacity hover:opacity-80"
            title="MaxRent — Inicio"
          >
            <Logo size="lg" tone="dark" />
          </Link>
          <h1 className="font-serif text-3xl tracking-tight text-dark">{heading}</h1>
          <p className="mt-2 text-sm text-gray-600">{subtitle}</p>
        </div>

        {isNewLead ? (
          <div
            className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900"
            role="status"
          >
            <p className="font-semibold">¡Recibimos tus datos!</p>
            <p className="mt-1 text-green-800">
              Para continuar, ingresa al portal con tu email{" "}
              {prefillEmail ? <strong>{prefillEmail}</strong> : null} y completa tu perfil.
            </p>
          </div>
        ) : null}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          {serverError ? (
            <p
              className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
              role="alert"
            >
              {serverError}
            </p>
          ) : null}
          {authErrorMessage ? (
            <p
              className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
              role="alert"
            >
              {authErrorMessage}
            </p>
          ) : null}
          {providerIds === null ? (
            <p className="text-sm text-gray-500 text-center">Cargando…</p>
          ) : (
            <>
              {hasGoogle ? (
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continuar con Google
                </button>
              ) : null}

              {hasGoogle && (hasResend || hasDevCredentials) ? (
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-3 bg-white text-gray-500">o</span>
                  </div>
                </div>
              ) : null}

              {hasResend ? (
                !emailSent ? (
                  <form onSubmit={handleEmailLogin} className="space-y-3">
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Email
                      </label>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@email.com"
                        required
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange/40 focus:border-orange transition-colors"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-orange rounded-lg hover:bg-[#E55A00] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? "Enviando..." : "Enviar link de acceso"}
                    </button>
                  </form>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-700 font-medium">Revisa tu email</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Te enviamos un link de acceso a <strong>{email}</strong>
                    </p>
                    <button
                      type="button"
                      onClick={() => setEmailSent(false)}
                      className="mt-3 text-sm text-orange hover:underline"
                    >
                      Usar otro email
                    </button>
                  </div>
                )
              ) : null}

              {hasDevCredentials && hasResend ? (
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-3 bg-white text-gray-500">o</span>
                  </div>
                </div>
              ) : null}

              {hasDevCredentials ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
                  <p className="text-xs font-medium text-amber-900">
                    Desarrollo: sin Google/Resend configurados. Entra con un email
                    (se crea el usuario en la base de datos local).
                  </p>
                  <form onSubmit={handleDevLogin} className="space-y-2">
                    <label
                      htmlFor="dev-email"
                      className="block text-sm font-medium text-amber-950"
                    >
                      Email (dev)
                    </label>
                    <input
                      id="dev-email"
                      type="email"
                      value={devEmail}
                      onChange={(e) => setDevEmail(e.target.value)}
                      placeholder="tu@email.com"
                      required
                      className="w-full px-3 py-2.5 border border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                    />
                    <button
                      type="submit"
                      disabled={devLoading}
                      className="w-full px-4 py-2.5 text-sm font-medium text-white bg-amber-700 rounded-lg hover:bg-amber-800 disabled:opacity-50"
                    >
                      {devLoading ? "Entrando…" : "Entrar (desarrollo)"}
                    </button>
                  </form>
                </div>
              ) : null}

              {!hasGoogle && !hasResend && !hasDevCredentials ? (
                <p className="text-sm text-red-600 text-center">
                  No hay proveedores de autenticación disponibles. Revisa la
                  configuración.
                </p>
              ) : null}
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-500">
          Al continuar, aceptas nuestros términos de servicio y política de
          privacidad.
        </p>
      </div>
    </main>
  );
}
