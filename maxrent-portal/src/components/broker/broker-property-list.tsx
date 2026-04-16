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
    return <p className="text-sm text-gray-500">Cargando…</p>;
  }
  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }
  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-600 rounded-lg border border-dashed border-gray-300 p-8 text-center">
        Aún no hay propiedades publicadas para brokers.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white">
      {items.map((p) => (
        <li key={p.id}>
          <Link
            href={`/broker/oportunidades/${p.id}`}
            className="flex items-center justify-between gap-4 px-4 py-4 hover:bg-gray-50"
          >
            <span className="font-medium text-gray-900">{p.title}</span>
            <span className="text-xs uppercase text-gray-500">{p.status}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
