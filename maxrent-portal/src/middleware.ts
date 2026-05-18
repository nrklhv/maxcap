// =============================================================================
// Middleware — Auth, onboarding inversionista, /staff interno, legacy /admin
// =============================================================================
//
// Importa SOLO `auth.config.ts` (Edge-safe) — NUNCA `auth.ts`, que arrastra
// Prisma y excede el límite de 1 MB del Edge Runtime de Vercel.
// =============================================================================

import NextAuth, { type Session } from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse, type NextRequest, type NextResponse as NextResponseType } from "next/server";

/** Request enriquecido con la sesión, igual al shape que NextAuth v5 pasa al callback. */
type AuthRequest = NextRequest & { auth: Session | null };

const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = new Set(["/", "/login", "/brokers", "/staff/login"]);

function isPublicInvitePath(pathname: string): boolean {
  return pathname.startsWith("/i/");
}

function isPublicApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/public/");
}

/** callbackUrl interno (misma app); evita open-redirect a //otro-dominio */
function isSafeInternalCallback(callback: string | null): callback is string {
  return Boolean(callback && callback.startsWith("/") && !callback.startsWith("//"));
}

// ─── Captura de referral via `?ref=` en cualquier URL del portal ─────────────
// El landing también persiste la cookie cross-subdomain (`Domain=.maxrent.cl`),
// pero browsers en private mode o con tracking strict pueden no transferirla.
// Por eso el header de la landing anexa `?ref=INV-XXX` al href de "Portal
// inversionista" como segundo mecanismo. Acá lo capturamos y lo guardamos en
// cookie del portal, para que `events.createUser` de NextAuth lo lea al alta.

const REFERRAL_COOKIE_NAME = "mxr_ref";
const REFERRAL_COOKIE_TTL_SECONDS = 60 * 24 * 60 * 60; // 60 días
const REFERRAL_CODE_PATTERN = /^(INV|BRK)-[A-Z0-9]{6,32}$/;

function maxrentCookieDomain(req: NextRequest): string | undefined {
  const host = req.nextUrl.hostname;
  if (host === "maxrent.cl" || host.endsWith(".maxrent.cl")) return ".maxrent.cl";
  return undefined; // localhost / vercel.app → cookie host-only
}

/**
 * Si la request tiene `?ref=INV-XXX` o `?ref=BRK-XXX` válido y no hay cookie
 * de referral ya seteada, persiste la cookie en la response para que el
 * próximo signup la pueda leer. Política first-touch (no sobreescribe).
 *
 * Idempotente y seguro de llamar en cualquier response del middleware.
 */
function attachReferralCookieIfNeeded(
  req: NextRequest,
  res: NextResponseType
): NextResponseType {
  const raw = req.nextUrl.searchParams.get("ref");
  if (!raw) return res;
  const code = raw.trim().toUpperCase();
  if (!REFERRAL_CODE_PATTERN.test(code)) return res;
  // First-touch: si ya hay cookie, no sobreescribimos.
  if (req.cookies.get(REFERRAL_COOKIE_NAME)) return res;
  res.cookies.set({
    name: REFERRAL_COOKIE_NAME,
    value: code,
    maxAge: REFERRAL_COOKIE_TTL_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: req.nextUrl.protocol === "https:",
    domain: maxrentCookieDomain(req),
  });
  return res;
}

export default auth((req) => attachReferralCookieIfNeeded(req, handleRequest(req)));

function handleRequest(req: AuthRequest): NextResponseType {
  const { pathname } = req.nextUrl;
  // Defense-in-depth: never run auth redirects on Next assets / dev tooling (matcher should
  // already skip these; this avoids unstyled HTML if the matcher misses an edge case).
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/__nextjs") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const isLoggedIn = !!req.auth;
  const isApiAuth = pathname.startsWith("/api/auth");
  const isPaymentWebhook = pathname.startsWith("/api/payments/webhook");
  const isFloidWebhook = pathname === "/api/floid/callback";
  const isNotificationsWebhook = pathname.startsWith(
    "/api/notifications/webhook/"
  );

  // Cookie de cuenta borrada: el JWT callback (auth.ts) marca `userMissing=true`
  // cuando el token apunta a un User que ya no existe en BD. Lo detectamos acá
  // y forzamos signOut limpiando las cookies de sesión + redirigiendo al login.
  // Sin esto, cookies viejas seguían entrando al portal con valores cacheados
  // (canInvest=true) hasta que el JWT expirara naturalmente (~30 días).
  // Exentos: rutas de NextAuth (para que el signOut/login funcione) + webhooks.
  if (
    isLoggedIn &&
    req.auth?.user?.userMissing === true &&
    !isApiAuth
  ) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("error", "AccountDeleted");
    const res = NextResponse.redirect(loginUrl);
    // Limpiar ambas cookies de sesión (la non-secure y la __Secure prefixed).
    res.cookies.set({ name: "authjs.session-token", value: "", maxAge: 0, path: "/" });
    res.cookies.set({
      name: "__Secure-authjs.session-token",
      value: "",
      maxAge: 0,
      path: "/",
      secure: true,
    });
    return res;
  }
  // Vercel Cron llega con header `Authorization: Bearer <CRON_SECRET>` que cada
  // endpoint /api/cron/* valida en su handler. El middleware de NextAuth debe
  // dejarlos pasar — sino corta el cron con 401 antes de llegar a la lógica
  // de auth interna del endpoint.
  const isCron = pathname.startsWith("/api/cron/");
  const isApi = pathname.startsWith("/api");

  if (pathname.startsWith("/admin")) {
    const suffix = pathname === "/admin" ? "" : pathname.slice("/admin".length);
    const url = new URL(`/staff${suffix}`, req.nextUrl.origin);
    url.search = req.nextUrl.search;
    return NextResponse.redirect(url, 308);
  }

  if (
    isApiAuth ||
    isPaymentWebhook ||
    isFloidWebhook ||
    isNotificationsWebhook ||
    isCron
  ) {
    return NextResponse.next();
  }

  if (!isLoggedIn && isApi) {
    if (isPublicApiPath(pathname)) {
      return NextResponse.next();
    }
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const isPublicRoute = PUBLIC_PATHS.has(pathname) || isPublicInvitePath(pathname);

  if (!isLoggedIn && pathname.startsWith("/staff") && pathname !== "/staff/login") {
    const login = new URL("/staff/login", req.nextUrl.origin);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  if (!isLoggedIn && !isPublicRoute && !pathname.startsWith("/staff")) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && pathname === "/login") {
    const u = req.auth?.user;
    const callback = req.nextUrl.searchParams.get("callbackUrl");

    // /login es la puerta pública del marketing — NUNCA redirige a /staff,
    // aunque la cuenta sea SUPER_ADMIN. El acceso staff vive solo en
    // /staff/login (URL interna, no enlazada desde el landing).
    // Si una cuenta es staff + inversionista (lo común), entra al portal
    // inversionista por esta puerta. Para ir a staff, va a /staff/login a mano.

    // 1) Respetar callback explícito si es seguro y no apunta a /staff.
    if (
      isSafeInternalCallback(callback) &&
      !callback.startsWith("/staff")
    ) {
      return NextResponse.redirect(new URL(callback, req.nextUrl.origin));
    }

    // 2) Default por rol — inversionista primero (el más común).
    if (u?.canInvest) {
      return NextResponse.redirect(new URL("/oportunidades", req.nextUrl.origin));
    }
    if (u?.brokerAccessStatus === "APPROVED") {
      return NextResponse.redirect(
        new URL("/broker/oportunidades", req.nextUrl.origin)
      );
    }
    if (u?.brokerAccessStatus === "PENDING") {
      return NextResponse.redirect(new URL("/broker/pending", req.nextUrl.origin));
    }

    // 3) Fallback: cuenta sin canInvest ni broker. Probablemente staff puro
    // o cuenta nueva que aún no tiene permisos. La mandamos a /oportunidades
    // (el middleware de onboarding la mantendrá ahí o la mandará a /perfil).
    return NextResponse.redirect(new URL("/oportunidades", req.nextUrl.origin));
  }

  if (isLoggedIn && pathname === "/staff/login") {
    if (req.auth?.user?.staffRole === "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/staff", req.nextUrl.origin));
    }
    // No redirigir a /dashboard: muchas cuentas son inversionistas y el layout de /staff
    // mandaba ahí → onboarding → sensación de “vuelve al login”. Dejamos en staff/login
    // para mostrar mensaje (página server).
    return NextResponse.next();
  }

  const onboardingCompleted = req.auth?.user?.onboardingCompleted ?? false;
  const canInvest = req.auth?.user?.canInvest ?? true;
  const staffRole = req.auth?.user?.staffRole;

  if (isLoggedIn && !isApi) {
    if (
      canInvest &&
      !onboardingCompleted &&
      pathname !== "/perfil" &&
      !pathname.startsWith("/broker") &&
      !pathname.startsWith("/staff")
    ) {
      return NextResponse.redirect(new URL("/perfil", req.nextUrl.origin));
    }

    if (
      pathname.startsWith("/staff") &&
      pathname !== "/staff/login" &&
      staffRole !== "SUPER_ADMIN"
    ) {
      const denied = new URL("/staff/login", req.nextUrl.origin);
      denied.searchParams.set("error", "forbidden");
      return NextResponse.redirect(denied);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Importante: excluir todo `/_next/*` (CSS, chunks, flight data, HMR).
     * Si el middleware de auth corre sobre esas rutas, el navegador puede no
     * cargar estilos y la app se ve “sin diseño”.
     */
    "/((?!_next/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|mjs|map|woff2|ttf|eot)$).*)",
  ],
};
