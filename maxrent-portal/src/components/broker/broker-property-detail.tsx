"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Property = {
  id: string;
  title: string;
  status: string;
  metadata: unknown;
};

export function BrokerPropertyDetail({ propertyId }: { propertyId: string }) {
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/broker/properties/${propertyId}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "No encontrada");
          return;
        }
        if (!cancelled) setProperty(data.property);
      } catch {
        if (!cancelled) setError("Error de red");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  if (loading) {
    return <p className="text-sm text-gray-500">Cargando…</p>;
  }
  if (error || !property) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">{error || "No encontrada"}</p>
        <Link href="/broker/oportunidades" className="text-sm text-blue-600 hover:underline">
          Volver al listado
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/broker/oportunidades"
        className="text-sm text-blue-600 hover:underline"
      >
        ← Oportunidades
      </Link>
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h1 className="text-2xl font-bold text-gray-900">{property.title}</h1>
          <span className="text-xs font-semibold uppercase text-gray-500">
            {property.status}
          </span>
        </div>
        {property.metadata != null ? (
          <pre className="text-xs bg-gray-50 rounded-lg p-4 overflow-x-auto text-gray-800">
            {JSON.stringify(property.metadata, null, 2)}
          </pre>
        ) : (
          <p className="text-sm text-gray-500">Sin detalle adicional cargado.</p>
        )}
      </div>
    </div>
  );
}
