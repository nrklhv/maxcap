/**
 * Restaurar un backup `.tar.gz` generado por `/api/cron/db-backup`.
 *
 * ⚠️ Este script TRUNCA todas las tablas user-owned de la DB target antes de
 * insertar el dump. NUNCA correrlo contra producción directamente — primero
 * crear un Neon branch (Neon Console → Branches → "Create branch from latest")
 * y apuntar `--target-url` ahí.
 *
 * Uso:
 *   tsx scripts/restore-from-backup.ts \
 *     --tarball ./db-backup-2026-05-13.tar.gz \
 *     --target-url 'postgresql://...neon.tech/neondb?sslmode=require' \
 *     [--yes]                # saltea confirmación interactiva
 *     [--block-prod-host]    # rechaza si target-url contiene este substring (default: el host de prod actual)
 *
 * Prerrequisitos en la DB target:
 *   1. El schema ya debe estar aplicado: `prisma migrate deploy` antes de correr esto.
 *   2. Acceso de escritura (`neondb_owner` u otro role con privileges).
 *
 * @domain backup
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";
import { parseArgs } from "node:util";
import { PrismaClient } from "@prisma/client";

interface Args {
  tarball: string;
  targetUrl: string;
  yes: boolean;
  blockProdHost: string | undefined;
}

function parseCli(): Args {
  const { values } = parseArgs({
    options: {
      tarball: { type: "string" },
      "target-url": { type: "string" },
      yes: { type: "boolean", default: false },
      "block-prod-host": { type: "string" },
    },
    strict: true,
  });

  if (typeof values.tarball !== "string") throw new Error("Falta --tarball");
  if (typeof values["target-url"] !== "string") throw new Error("Falta --target-url");

  return {
    tarball: values.tarball,
    targetUrl: values["target-url"],
    yes: values.yes === true,
    blockProdHost:
      typeof values["block-prod-host"] === "string" ? values["block-prod-host"] : undefined,
  };
}

function prompt(message: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(message);
    process.stdin.resume();
    process.stdin.once("data", (data) => {
      process.stdin.pause();
      resolve(data.toString().trim());
    });
  });
}

function ensureNotProd(url: string, block: string | undefined) {
  if (!block) return;
  if (url.includes(block)) {
    throw new Error(
      `target-url contiene "${block}" — protección contra restaurar a producción. ` +
        `Usa --target-url apuntando a un Neon branch.`
    );
  }
}

function extractTarball(tarballPath: string): string {
  const tempDir = mkdtempSync(join(tmpdir(), "maxrent-restore-"));
  console.log(`[restore] desempaquetando ${tarballPath} → ${tempDir}`);
  execFileSync("tar", ["-xzf", tarballPath, "-C", tempDir], { stdio: "inherit" });
  return tempDir;
}

type Metadata = {
  startedAt: string;
  finishedAt: string;
  totalRows: number;
  tables: Array<{ name: string; rows: number }>;
  schemaVersion: string;
};

function readMetadata(extractedDir: string): Metadata {
  const path = join(extractedDir, "metadata.json");
  if (!statSync(path).isFile()) throw new Error("No se encontró metadata.json en el tarball");
  return JSON.parse(readFileSync(path, "utf-8")) as Metadata;
}

function listJsonlFiles(extractedDir: string): string[] {
  const dataDir = join(extractedDir, "data");
  return readdirSync(dataDir)
    .filter((f) => f.endsWith(".jsonl"))
    .map((f) => join(dataDir, f))
    .sort();
}

function tableNameFromPath(p: string): string {
  return basename(p).replace(/\.jsonl$/, "");
}

function isSafeTableName(name: string): boolean {
  return /^[a-z_][a-z0-9_]*$/i.test(name);
}

/**
 * Lee JSONL en chunks e inserta en la DB. Detecta los nombres de columnas de
 * la primera fila — todas las filas del JSONL deben tener el mismo set de keys
 * (lo cual es invariante porque vienen de `SELECT * FROM tabla`).
 */
async function restoreTable(
  prisma: PrismaClient,
  tableName: string,
  jsonlPath: string,
  expectedRows: number
): Promise<number> {
  if (!isSafeTableName(tableName)) {
    throw new Error(`Table name no seguro: ${tableName}`);
  }
  const content = readFileSync(jsonlPath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim().length > 0);

  if (lines.length === 0) {
    console.log(`[restore] ${tableName}: 0 filas (vacía)`);
    return 0;
  }
  if (lines.length !== expectedRows) {
    console.warn(
      `[restore] ${tableName}: metadata decía ${expectedRows} filas pero el JSONL tiene ${lines.length}`
    );
  }

  const first = JSON.parse(lines[0]) as Record<string, unknown>;
  const columns = Object.keys(first);
  if (columns.length === 0) throw new Error(`Tabla ${tableName}: filas sin columnas`);

  const columnsList = columns.map((c) => `"${c}"`).join(", ");
  const chunkSize = 500;
  let inserted = 0;

  for (let offset = 0; offset < lines.length; offset += chunkSize) {
    const chunk = lines.slice(offset, offset + chunkSize);
    const placeholders: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    for (const line of chunk) {
      const row = JSON.parse(line) as Record<string, unknown>;
      const rowPlaceholders: string[] = [];
      for (const col of columns) {
        rowPlaceholders.push(`$${i++}`);
        values.push(row[col] ?? null);
      }
      placeholders.push(`(${rowPlaceholders.join(", ")})`);
    }
    const sql = `INSERT INTO "${tableName}" (${columnsList}) VALUES ${placeholders.join(", ")}`;
    await prisma.$executeRawUnsafe(sql, ...values);
    inserted += chunk.length;
  }

  console.log(`[restore] ${tableName}: ${inserted} filas insertadas`);
  return inserted;
}

async function main() {
  const args = parseCli();

  // Si no se pasó --block-prod-host, intentamos adivinarlo del proyecto local
  // (mejor explícito que implícito — pedimos al usuario que ponga el host de prod).
  if (args.blockProdHost === undefined) {
    console.warn(
      "[restore] ⚠️ Recomendado pasar --block-prod-host=<substring-del-host-de-prod> " +
        "para que el script rechace target-url que contenga ese substring."
    );
  } else {
    ensureNotProd(args.targetUrl, args.blockProdHost);
  }

  // Confirmación interactiva
  if (!args.yes) {
    const hostMatch = /@([^/?]+)/.exec(args.targetUrl);
    const host = hostMatch?.[1] ?? "(unknown)";
    console.log(`\n⚠️  RESTORE DESTRUCTIVO\n`);
    console.log(`Tarball:    ${args.tarball}`);
    console.log(`Target host: ${host}`);
    console.log(`\nEste script TRUNCA todas las tablas user-owned antes de insertar.\n`);
    const ans = await prompt(`Escribí "restore" para continuar: `);
    if (ans !== "restore") {
      console.log("Cancelado.");
      process.exit(0);
    }
  }

  const extractedDir = extractTarball(args.tarball);
  let prisma: PrismaClient | null = null;
  try {
    const metadata = readMetadata(extractedDir);
    console.log(
      `[restore] dump del ${metadata.startedAt}, schema=${metadata.schemaVersion}, ` +
        `${metadata.totalRows} filas en ${metadata.tables.length} tablas`
    );

    prisma = new PrismaClient({
      datasources: { db: { url: args.targetUrl } },
    });

    // Truncar todas las tablas user-owned en una transacción.
    // CASCADE para no pelearnos con FKs; RESTART IDENTITY para resetear sequences.
    const expected = new Map(metadata.tables.map((t) => [t.name, t.rows]));
    const tableNames = metadata.tables.map((t) => t.name).filter((n) => isSafeTableName(n));
    const truncateList = tableNames.map((n) => `"${n}"`).join(", ");
    if (tableNames.length > 0) {
      console.log(`[restore] TRUNCATE ${tableNames.length} tablas (CASCADE, RESTART IDENTITY)…`);
      await prisma.$executeRawUnsafe(`TRUNCATE ${truncateList} RESTART IDENTITY CASCADE`);
    }

    // Insertar tabla por tabla en el orden del listing.
    // Como ya hicimos TRUNCATE CASCADE de antemano, el orden de inserción no importa
    // para FKs (Postgres permite filas sin referencias intermedias durante una sesión).
    // Si futuro requiere DEFERRABLE constraints, agregar `SET CONSTRAINTS ALL DEFERRED`.
    let totalInserted = 0;
    for (const jsonlPath of listJsonlFiles(extractedDir)) {
      const tableName = tableNameFromPath(jsonlPath);
      const expectedRows = expected.get(tableName) ?? 0;
      totalInserted += await restoreTable(prisma, tableName, jsonlPath, expectedRows);
    }

    console.log(`\n[restore] ✓ ${totalInserted} filas insertadas en ${tableNames.length} tablas.`);
    console.log(`[restore] No olvides correr ANALYZE en producción para refrescar estadísticas.`);
  } finally {
    if (prisma) await prisma.$disconnect();
    rmSync(extractedDir, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error("[restore] FAIL:", e);
  process.exit(1);
});
