"use client";

/**
 * Broker ficha de una propiedad publicada en estado disponible (solo lectura de inventario).
 *
 * @domain maxrent-portal
 * @see GET `/api/broker/properties/[id]`
 */

import Link from "next/link";
import { useEffect, useState } from "react";

type Property = {
  id: string;
  title: string;
  status: string;
  metadata: unknown;
  inventoryCode?: string | null;
  houmPropertyId?: string | null;
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
          if (!cancelled) setError(data.error || "No encontrada");
          return;
        }
        if (!cancelled) {
          setProperty(data.property);
          setError(null);
        }
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
    return <p className="text-sm text-broker-muted">Cargando…</p>;
  }
  if (error || !property) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">{error || "No encontrada"}</p>
        <Link
          href="/broker/oportunidades"
          className="text-sm font-medium text-broker-accent hover:text-broker-accent-hover hover:underline"
        >
          Volver al listado
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/broker/oportunidades"
        className="text-sm font-medium text-broker-accent transition-colors hover:text-broker-accent-hover hover:underline"
      >
        ← Oportunidades
      </Link>
      <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-broker-navy">
            {property.title}
          </h1>
          <span className="text-xs font-medium uppercase tracking-wide text-broker-muted">
            {property.status}
          </span>
        </div>
        <p className="text-sm text-broker-muted">
          El inventario se reserva cuando un inversionista inicia una reserva desde su portal. Desde acá solo
          consultás la ficha publicada.
        </p>
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-broker-muted">
          {property.inventoryCode ? (
            <div>
              <dt className="inline text-broker-muted/80">Código inventario: </dt>
              <dd className="inline font-mono font-medium text-broker-navy">{property.inventoryCode}</dd>
            </div>
          ) : null}
          {property.houmPropertyId ? (
            <div>
              <dt className="inline text-broker-muted/80">Houm: </dt>
              <dd className="inline font-mono text-broker-navy">{property.houmPropertyId}</dd>
            </div>
          ) : null}
        </dl>
        {property.metadata != null ? (
          <pre className="overflow-x-auto rounded-lg border border-gray-100 bg-broker-canvas p-4 text-xs text-broker-navy">
            {JSON.stringify(property.metadata, null, 2)}
          </pre>
        ) : (
          <p className="text-sm text-broker-muted">Sin detalle adicional cargado.</p>
        )}
      </div>
    </div>
  );
}
