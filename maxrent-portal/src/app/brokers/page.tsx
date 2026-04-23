import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: { absolute: "MaxRent - Broker" },
  description: "Trabaja con nosotros y accede a oportunidades de inversión inmobiliaria.",
};

export default function BrokersLandingPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-16 md:py-24 space-y-10">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
            Canal brokers
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            Ofrece propiedades de inversión a tus clientes
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            Si quieres trabajar con MaxRent, crea tu cuenta y solicita acceso. Cuando el
            equipo valide tu perfil, podrás ver el inventario disponible y el material
            necesario para asesorar a tus clientes.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/login?callbackUrl=/broker"
            className="inline-flex justify-center items-center px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            Inscribirme
          </Link>
          <Link
            href="/login?callbackUrl=/broker"
            className="inline-flex justify-center items-center px-6 py-3 rounded-lg border border-gray-300 bg-white text-gray-800 font-medium hover:bg-gray-50 transition-colors"
          >
            Ya tengo cuenta
          </Link>
        </div>

        <p className="text-sm text-gray-500">
          Tras registrarte, verás el estado de tu autorización en el portal broker hasta
          que MaxRent apruebe tu acceso.
        </p>
      </div>
    </main>
  );
}
