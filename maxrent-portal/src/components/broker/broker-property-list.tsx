"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type PropertyRow = {
  id: string;
  title: string;
  status: string;
  metadata: unknown;
};

export function BrokerPropertyList() {
  const [items, setItems] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/broker/properties");
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "No se pudo cargar");
          return;
        }
        if (!cancelled) setItems(data.properties || []);
      } catch {
        if (!cancelled) setError("Error de red");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="text-sm text-broker-muted">Cargando…</p>;
  }
  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }
  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-broker-muted">
        Aún no hay propiedades publicadas para brokers.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white shadow-sm">
      {items.map((p) => (
        <li key={p.id}>
          <Link
            href={`/broker/oportunidades/${p.id}`}
            className="flex items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-broker-canvas/60"
          >
            <span className="font-medium text-broker-navy">{p.title}</span>
            <span className="text-xs font-medium uppercase tracking-wide text-broker-muted">
              {p.status}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
