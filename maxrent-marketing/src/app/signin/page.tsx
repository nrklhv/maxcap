import { Suspense } from "react";
import SignInContent from "./signin-content";

function SignInFallback() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-cream">
      <p className="text-sm text-gray-3">Cargando…</p>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInFallback />}>
      <SignInContent />
    </Suspense>
  );
}
