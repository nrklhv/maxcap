// =============================================================================
// Middleware — Protege todo el sitio salvo /signin y la API de auth
// =============================================================================
//
// Importa SOLO `auth.config.ts` (Edge-safe). Nunca `auth.ts` (arrastra Node).
// Los recursos descargables NO viven en /public — se sirven via API gated
// (/api/recursos/[...path]) para que el allowlist también proteja descargas.
// =============================================================================

import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = new Set(["/signin"]);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/__nextjs") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  const isLoggedIn = !!req.auth;
  const isPublic = PUBLIC_PATHS.has(pathname);

  if (!isLoggedIn && pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (!isLoggedIn && !isPublic) {
    const url = new URL("/signin", req.nextUrl.origin);
    if (pathname !== "/") url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (isLoggedIn && pathname === "/signin") {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/|__nextjs|favicon.ico).*)",
  ],
};
