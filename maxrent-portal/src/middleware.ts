// =============================================================================
// Middleware — Auth, onboarding inversionista, /staff interno, legacy /admin
// =============================================================================
//
// Importa SOLO `auth.config.ts` (Edge-safe) — NUNCA `auth.ts`, que arrastra
// Prisma y excede el límite de 1 MB del Edge Runtime de Vercel.
// =============================================================================

import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

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

export default auth((req) => {
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
  const isApi = pathname.startsWith("/api");

  if (pathname.startsWith("/admin")) {
    const suffix = pathname === "/admin" ? "" : pathname.slice("/admin".length);
    const url = new URL(`/staff${suffix}`, req.nextUrl.origin);
    url.search = req.nextUrl.search;
    return NextResponse.redirect(url, 308);
  }

  if (isApiAuth || isPaymentWebhook || isFloidWebhook) {
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
    // Staff antes que canInvest: muchas cuentas staff también son inversionistas;
    // si no, nunca llegan a /staff y parece un “parpadeo” al volver al login/dashboard.
    if (u?.staffRole === "SUPER_ADMIN") {
      // Respetar /broker/*, /dashboard, etc.: staff suele ser también broker/inversionista.
      if (isSafeInternalCallback(callback)) {
        return NextResponse.redirect(new URL(callback, req.nextUrl.origin));
      }
      return NextResponse.redirect(new URL("/staff", req.nextUrl.origin));
    }
    if (u?.canInvest) {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
    }
    if (u?.brokerAccessStatus === "APPROVED") {
      return NextResponse.redirect(
        new URL("/broker/oportunidades", req.nextUrl.origin)
      );
    }
    if (u?.brokerAccessStatus === "PENDING") {
      return NextResponse.redirect(new URL("/broker/pending", req.nextUrl.origin));
    }
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
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
});

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
