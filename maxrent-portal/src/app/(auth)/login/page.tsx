// =============================================================================
// Login Page — envuelve el cliente en Suspense (useSearchParams)
// =============================================================================

import { Suspense } from "react";
import LoginContent from "./login-content";

function LoginFallback() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <p className="text-sm text-gray-500">Cargando…</p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  );
}
