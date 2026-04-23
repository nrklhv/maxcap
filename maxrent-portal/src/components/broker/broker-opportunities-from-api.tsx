"use client";

/**
 * Broker Oportunidades: catálogo desde `/api/broker/properties` (solo disponibles).
 * Las reservas son vía inversionistas (`Reservation`); ver inversionistas patrocinados en su sección.
 *
 * @domain maxrent-portal
 * @see PropertyInventoryTable
 */

import { useCallback, useEffect, useState } from "react";
import type { PropertyInventoryRow } from "@/components/broker/property-inventory-table";
import { PropertyInventoryTable } from "@/components/broker/property-inventory-table";

type ApiPropertyRow = {
  id: string;
  title: string;
  status: string;
  metadata: unknown;
  houmPropertyId?: string | null;
  inventoryCode?: string | null;
};

function mapApiRows(list: ApiPropertyRow[]): PropertyInventoryRow[] {
  return list.map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status,
    metadata: p.metadata,
    houmPropertyId: p.houmPropertyId ?? null,
    inventoryCode: p.inventoryCode ?? null,
  }));
}

export function BrokerOpportunitiesFromApi() {
  const [availableRows, setAvailableRows] = useState<PropertyInventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await fetch("/api/broker/properties");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo cargar");
        return;
      }
      const availableRaw = (data.available ?? data.properties ?? []) as ApiPropertyRow[];
      setAvailableRows(mapApiRows(availableRaw));
    } catch {
      setError("Error de red");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (loading) {
    return <p className="px-1 py-6 text-sm text-broker-muted">Cargando…</p>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 bg-broker-accent-soft px-4 py-4">
        <h2 className="font-serif text-lg font-semibold tracking-tight text-broker-navy">
          Disponibles
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-broker-muted">
          Publicadas por staff y en estado disponible. Podés abrir la ficha para ver el detalle; las reservas las
          realizan tus inversionistas desde el portal inversionista.
        </p>
      </div>
      <PropertyInventoryTable
        variant="broker"
        brokerListMode="available"
        rows={availableRows}
        loading={false}
        emptyLabel="No hay oportunidades publicadas. El equipo debe publicar propiedades desde Staff → Propiedades."
      />
    </div>
  );
}
