/**
 * Seeds 10 demo inventory rows for Staff → Propiedades (draft: not visible to brokers).
 * Re-runnable: upserts by stable houmPropertyId `seed-demo-01` … `seed-demo-10`.
 * Does not reset visibleToBrokers on update so staff publish state is preserved.
 */

import type { Prisma, PrismaClient } from "@prisma/client";

type DemoRow = {
  comuna: string;
  dir: string;
  tipo: string;
  m2: number;
  dorm: number;
  ban: number;
  arriendo: number;
  moneda: "pesos" | "uf";
  venta: number;
  monedaVenta: "UF" | "Pesos";
  lat: number;
  lng: number;
};

/** Ten Chile-style demo units; metadata keys match staffPropertyListDisplay heuristics. */
const DEMO_PROPERTIES: DemoRow[] = [
  {
    comuna: "Santiago",
    dir: "Av. Santa Rosa 1213",
    tipo: "Departamento",
    m2: 51,
    dorm: 2,
    ban: 2,
    arriendo: 450000,
    moneda: "pesos",
    venta: 2850,
    monedaVenta: "UF",
    lat: -33.4520645,
    lng: -70.6436254,
  },
  {
    comuna: "Santiago",
    dir: "Av. Santa Rosa 2118",
    tipo: "Departamento",
    m2: 50,
    dorm: 2,
    ban: 1,
    arriendo: 400000,
    moneda: "pesos",
    venta: 2450,
    monedaVenta: "UF",
    lat: -33.4567805,
    lng: -70.6438537,
  },
  {
    comuna: "Santiago",
    dir: "Rosas 1513",
    tipo: "Departamento",
    m2: 47,
    dorm: 2,
    ban: 1,
    arriendo: 450000,
    moneda: "pesos",
    venta: 3114,
    monedaVenta: "UF",
    lat: -33.4355224,
    lng: -70.6566736,
  },
  {
    comuna: "Independencia",
    dir: "Rivera 1914",
    tipo: "Departamento",
    m2: 33,
    dorm: 1,
    ban: 1,
    arriendo: 270000,
    moneda: "pesos",
    venta: 1800,
    monedaVenta: "UF",
    lat: -33.4262441,
    lng: -70.657939,
  },
  {
    comuna: "Estación Central",
    dir: "Conde del Maule 808",
    tipo: "Departamento",
    m2: 30,
    dorm: 1,
    ban: 1,
    arriendo: 270000,
    moneda: "pesos",
    venta: 1650,
    monedaVenta: "UF",
    lat: -33.4532597,
    lng: -70.6957911,
  },
  {
    comuna: "Ñuñoa",
    dir: "Alc. Jorge Monckeberg 905",
    tipo: "Departamento",
    m2: 33,
    dorm: 1,
    ban: 1,
    arriendo: 12,
    moneda: "uf",
    venta: 3390,
    monedaVenta: "UF",
    lat: -33.4554555,
    lng: -70.5835746,
  },
  {
    comuna: "Santiago",
    dir: "San Diego 1405 Torre C",
    tipo: "Departamento",
    m2: 38,
    dorm: 2,
    ban: 1,
    arriendo: 340000,
    moneda: "pesos",
    venta: 2350,
    monedaVenta: "UF",
    lat: -33.4629873,
    lng: -70.6488226,
  },
  {
    comuna: "La Florida",
    dir: "Lago Pirihueico 1704A",
    tipo: "Departamento",
    m2: 31.5,
    dorm: 1,
    ban: 1,
    arriendo: 380000,
    moneda: "pesos",
    venta: 2500,
    monedaVenta: "UF",
    lat: -33.5139526,
    lng: -70.5925708,
  },
  {
    comuna: "Ñuñoa",
    dir: "Chile España 310",
    tipo: "Departamento",
    m2: 49,
    dorm: 1,
    ban: 1,
    arriendo: 480000,
    moneda: "pesos",
    venta: 4000,
    monedaVenta: "UF",
    lat: -33.45079,
    lng: -70.5978478,
  },
  {
    comuna: "Macul",
    dir: "Av. Quilín 211",
    tipo: "Departamento",
    m2: 37,
    dorm: 1,
    ban: 1,
    arriendo: 345000,
    moneda: "pesos",
    venta: 130000000,
    monedaVenta: "Pesos",
    lat: -33.4874407,
    lng: -70.616071,
  },
];

function metadataFor(p: DemoRow): Prisma.InputJsonValue {
  return {
    comuna: p.comuna,
    dir: p.dir,
    tipo: p.tipo,
    m2: p.m2,
    dorm: p.dorm,
    ban: p.ban,
    arriendo: p.arriendo,
    moneda: p.moneda,
    venta: p.venta,
    monedaVenta: p.monedaVenta,
    lat: p.lat,
    lng: p.lng,
    seed: true,
  };
}

export async function seedDraftDemoProperties(prisma: PrismaClient): Promise<void> {
  for (let i = 0; i < DEMO_PROPERTIES.length; i += 1) {
    const p = DEMO_PROPERTIES[i];
    const houmPropertyId = `seed-demo-${String(i + 1).padStart(2, "0")}`;
    const inventoryCode = `MR-SEED-${String(i + 1).padStart(2, "0")}`;
    const title = `${p.comuna} · ${p.dir}`;
    const meta = metadataFor(p);

    await prisma.property.upsert({
      where: { houmPropertyId },
      create: {
        title,
        houmPropertyId,
        inventoryCode,
        status: "AVAILABLE",
        visibleToBrokers: false,
        metadata: meta,
      },
      update: {
        title,
        inventoryCode,
        metadata: meta,
      },
    });
  }
}
