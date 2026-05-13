/**
 * Importa el Excel "LAB Capital Venta.xlsx" como un Pool del producto 2.
 *
 * Uso:
 *   npx tsx scripts/import-lab-pool.ts \
 *     --xlsx ./LAB.xlsx \
 *     --uf 40000 \
 *     --slug propiedades-san-miguel \
 *     --name "Propiedades San Miguel" \
 *     --cap-rate 0.058 \
 *     --reservation-fee 100000 \
 *     [--dry-run]
 *
 * Idempotente: si lo corres dos veces sobre el mismo Excel, hace upsert de cada
 * unidad por (poolId, externalId) y actualiza el pool con métricas frescas.
 *
 * En --dry-run: parsea y muestra qué haría, pero NO escribe a la BD.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import * as XLSX from "xlsx";
import { PrismaClient, Prisma } from "@prisma/client";
import {
  computePoolMetrics,
  parseLabExcelRows,
  type RawLabRow,
} from "../src/lib/pool/lab-excel-parser";

interface CliArgs {
  xlsx: string;
  uf: number;
  slug: string;
  name: string;
  capRate: number;
  reservationFee: number;
  description: string | undefined;
  dryRun: boolean;
}

function parseCli(): CliArgs {
  const { values } = parseArgs({
    options: {
      xlsx: { type: "string" },
      uf: { type: "string" },
      slug: { type: "string" },
      name: { type: "string" },
      "cap-rate": { type: "string" },
      "reservation-fee": { type: "string" },
      description: { type: "string" },
      "dry-run": { type: "boolean", default: false },
    },
    strict: true,
  });

  const required = (k: keyof typeof values, label: string): string => {
    const v = values[k];
    if (typeof v !== "string" || v.trim() === "") {
      throw new Error(`Falta argumento requerido --${label}`);
    }
    return v;
  };

  return {
    xlsx: required("xlsx", "xlsx"),
    uf: Number(required("uf", "uf")),
    slug: required("slug", "slug"),
    name: required("name", "name"),
    capRate: Number(required("cap-rate", "cap-rate")),
    reservationFee: Number(required("reservation-fee", "reservation-fee")),
    description: typeof values.description === "string" ? values.description : undefined,
    dryRun: values["dry-run"] === true,
  };
}

async function main() {
  const args = parseCli();

  const xlsxPath = resolve(args.xlsx);
  if (!existsSync(xlsxPath)) {
    throw new Error(`No existe el archivo ${xlsxPath}`);
  }

  console.log(`[import-lab-pool] leyendo ${xlsxPath}…`);
  const buf = readFileSync(xlsxPath);
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("El Excel no tiene hojas");
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<RawLabRow>(sheet, { defval: null });

  console.log(`[import-lab-pool] hoja "${sheetName}" → ${rows.length} filas totales`);

  const { units, discarded } = parseLabExcelRows(rows, {
    capRateBruto: args.capRate,
    ufValueClp: args.uf,
  });
  const metrics = computePoolMetrics(units);

  console.log(`[import-lab-pool] parseadas ${units.length} unidades para el pool`);
  console.log(`[import-lab-pool] descartadas ${discarded.length} filas`);
  if (discarded.length > 0) {
    const reasonCounts = discarded.reduce<Record<string, number>>((acc, d) => {
      acc[d.reason] = (acc[d.reason] || 0) + 1;
      return acc;
    }, {});
    for (const [reason, n] of Object.entries(reasonCounts)) {
      console.log(`  - ${n} × "${reason}"`);
    }
  }
  console.log("[import-lab-pool] métricas calculadas:", metrics);

  if (args.dryRun) {
    console.log("\n[import-lab-pool] --dry-run: no escribo a BD. Primeras 3 unidades:");
    for (const u of units.slice(0, 3)) {
      console.log(JSON.stringify(u, null, 2));
    }
    return;
  }

  const prisma = new PrismaClient();
  try {
    console.log(`[import-lab-pool] upsert del pool slug="${args.slug}"…`);
    const pool = await prisma.pool.upsert({
      where: { slug: args.slug },
      create: {
        slug: args.slug,
        name: args.name,
        description: args.description,
        capRateBruto: new Prisma.Decimal(args.capRate),
        reservationFeeClp: new Prisma.Decimal(args.reservationFee),
        totalUnits: metrics.totalUnits,
        totalValueUf: new Prisma.Decimal(metrics.totalValueUf),
        totalMonthlyRentClp: new Prisma.Decimal(metrics.totalMonthlyRentClp),
        occupancyPct: metrics.occupancyPct,
      },
      update: {
        name: args.name,
        description: args.description,
        capRateBruto: new Prisma.Decimal(args.capRate),
        reservationFeeClp: new Prisma.Decimal(args.reservationFee),
        totalUnits: metrics.totalUnits,
        totalValueUf: new Prisma.Decimal(metrics.totalValueUf),
        totalMonthlyRentClp: new Prisma.Decimal(metrics.totalMonthlyRentClp),
        occupancyPct: metrics.occupancyPct,
      },
    });
    console.log(`[import-lab-pool] pool id=${pool.id}`);

    let created = 0;
    let updated = 0;
    for (const u of units) {
      const existing = await prisma.poolUnit.findUnique({
        where: { poolId_externalId: { poolId: pool.id, externalId: u.externalId } },
      });
      const data = {
        label: u.label,
        priceUf: new Prisma.Decimal(u.priceUf),
        priceClp: new Prisma.Decimal(u.priceClp),
        monthlyRentClp: new Prisma.Decimal(u.monthlyRentClp),
        ocupacion: u.ocupacion,
        comuna: u.comuna,
        dormitorios: u.dormitorios,
        banos: u.banos,
        superficieUtilM2: u.superficieUtilM2,
        superficieTerrazaM2: u.superficieTerrazaM2,
        internalData: u.internalData as unknown as Prisma.InputJsonValue,
      };
      if (existing) {
        await prisma.poolUnit.update({ where: { id: existing.id }, data });
        updated += 1;
      } else {
        await prisma.poolUnit.create({
          data: {
            poolId: pool.id,
            externalId: u.externalId,
            ...data,
          },
        });
        created += 1;
      }
    }
    console.log(
      `[import-lab-pool] unidades: ${created} creadas, ${updated} actualizadas`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
