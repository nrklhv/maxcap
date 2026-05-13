/**
 * Backup diario offsite de la DB a Vercel Blob.
 *
 * Estrategia:
 *   1. Lista tablas via `pg_catalog` (excluye `_prisma_migrations` — se rehace
 *      automáticamente con `prisma migrate deploy` al restaurar).
 *   2. Por cada tabla, `SELECT *` y serializa a JSONL (1 fila = 1 línea JSON).
 *   3. Empaqueta todo en un `.tar.gz` con metadata.json al lado.
 *   4. Sube a Vercel Blob privado con nombre `db-backups/YYYY-MM-DD.tar.gz`.
 *   5. Cleanup: borra blobs > 30 días.
 *
 * Restauración:
 *   • Schema → `prisma migrate deploy` (las migrations están versionadas en git).
 *   • Data → `scripts/restore-from-backup.ts <archivo.tar.gz>` que hace
 *     `TRUNCATE ... RESTART IDENTITY CASCADE` + `INSERT` por tabla.
 *
 * Por qué JSONL en lugar de INSERT INTO ... VALUES:
 *   • Streamable (no carga la tabla entera en memoria al restaurar).
 *   • Tolerante a cambios de schema (campo nuevo opcional NO rompe el restore).
 *   • Triviable de inspeccionar manualmente con `jq`.
 *
 * Por qué no `pg_dump`:
 *   • No está instalado en lambdas de Vercel y traerlo via Docker es Pro+.
 *   • Para una DB administrada por Prisma migrations, data-only es suficiente.
 *
 * @domain backup
 * @see /api/cron/db-backup
 * @see scripts/restore-from-backup.ts
 */

import { gzip } from "node:zlib";
import { promisify } from "node:util";
import { Buffer } from "node:buffer";
import { prisma } from "@/lib/prisma";

const gzipAsync = promisify(gzip);

/** Resultado de un backup. */
export type DbBackupResult = {
  ok: true;
  blobPath: string;
  blobUrl: string;
  /** ISO timestamp del momento en que arrancó el backup. */
  startedAt: string;
  /** Tamaño del tar.gz subido, en bytes. */
  sizeBytes: number;
  /** Filas totales serializadas across todas las tablas. */
  totalRows: number;
  /** Detalle por tabla. */
  tables: Array<{ name: string; rows: number }>;
};

/** Lista de tablas a excluir del backup. */
const EXCLUDED_TABLES = new Set<string>([
  "_prisma_migrations", // se reconstruye con prisma migrate deploy
]);

/**
 * Pregunta a Postgres por las tablas user-owned del schema public.
 * Solo tablas base (no vistas, no materializaciones).
 */
async function listUserTables(): Promise<string[]> {
  const rows = await prisma.$queryRawUnsafe<Array<{ table_name: string }>>(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
     ORDER BY table_name`
  );
  return rows.map((r) => r.table_name).filter((t) => !EXCLUDED_TABLES.has(t));
}

/**
 * Serializa todas las filas de una tabla como JSONL. Valores `Date` se serializan
 * como ISO string para que JSON.stringify no los pierda; valores `Buffer` quedan
 * como objeto `{type:"Buffer", data:[...]}` (estándar de Node) y al restaurar se
 * reconstruyen. `BigInt` no es común en este schema pero por seguridad lo
 * serializo como string.
 */
async function dumpTableAsJsonl(tableName: string): Promise<{ jsonl: string; rows: number }> {
  // Usamos query identifiers escapados via Prisma — pero $queryRawUnsafe permite
  // cualquier SQL. El input `tableName` viene del listUserTables() que ya filtró
  // contra information_schema (no es input de usuario), pero igual lo validamos.
  if (!/^[a-z_][a-z0-9_]*$/i.test(tableName)) {
    throw new Error(`Table name no seguro para SQL: ${tableName}`);
  }

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${tableName}"`
  );

  const lines = rows.map((row) =>
    JSON.stringify(row, (_, value) => {
      if (typeof value === "bigint") return value.toString();
      return value;
    })
  );

  return { jsonl: lines.join("\n") + (lines.length ? "\n" : ""), rows: rows.length };
}

// ---------------------------------------------------------------------------
// Tar minimal — genera un USTAR archive sin depender de librerías nativas
// ---------------------------------------------------------------------------
//
// Formato USTAR (subset de POSIX tar) compatible con `tar -xzf`. Implementado
// inline para no agregar dependencia. Solo soporta archivos regulares hasta
// 8 GB cada uno (más que suficiente para tablas individuales).
// ---------------------------------------------------------------------------

function octalField(value: number, width: number): Buffer {
  // tar usa octal terminado en NUL en campos numéricos
  const str = value.toString(8).padStart(width - 1, "0") + "\0";
  return Buffer.from(str, "ascii");
}

function strField(value: string, width: number): Buffer {
  const buf = Buffer.alloc(width);
  buf.write(value.slice(0, width - 1), 0, "utf8");
  return buf;
}

function buildTarHeader(name: string, size: number, mtimeSec: number): Buffer {
  const header = Buffer.alloc(512);

  strField(name, 100).copy(header, 0); // name
  octalField(0o644, 8).copy(header, 100); // mode
  octalField(0, 8).copy(header, 108); // uid
  octalField(0, 8).copy(header, 116); // gid
  octalField(size, 12).copy(header, 124); // size
  octalField(mtimeSec, 12).copy(header, 136); // mtime
  // checksum (offset 148, len 8): se calcula con espacios como placeholder
  Buffer.from("        ").copy(header, 148);
  header[156] = 0x30; // typeflag "0" = regular file
  Buffer.from("ustar\0", "ascii").copy(header, 257); // magic
  Buffer.from("00", "ascii").copy(header, 263); // version

  // Calcular checksum
  let sum = 0;
  for (let i = 0; i < 512; i++) sum += header[i];
  octalField(sum, 7).copy(header, 148);
  header[155] = 0x20; // espacio después del checksum

  return header;
}

/** Padding a múltiplo de 512 bytes (formato tar). */
function tarPadding(size: number): Buffer {
  const rem = size % 512;
  return rem === 0 ? Buffer.alloc(0) : Buffer.alloc(512 - rem);
}

/**
 * Empaqueta una lista de archivos `{ name, content }` en un buffer tar válido.
 * El consumidor lo comprime con gzip después.
 */
export function buildTar(files: Array<{ name: string; content: string | Buffer }>): Buffer {
  const parts: Buffer[] = [];
  const mtime = Math.floor(Date.now() / 1000);
  for (const f of files) {
    const data = typeof f.content === "string" ? Buffer.from(f.content, "utf8") : f.content;
    parts.push(buildTarHeader(f.name, data.length, mtime));
    parts.push(data);
    parts.push(tarPadding(data.length));
  }
  // dos bloques NUL finales (end-of-archive)
  parts.push(Buffer.alloc(1024));
  return Buffer.concat(parts);
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/**
 * Arma el dump completo de la DB en memoria: lista tablas, dumpa cada una,
 * empaqueta en tar.gz. Devuelve el buffer comprimido + la metadata.
 *
 * Esta función NO sube nada a Blob — solo arma el dump. El caller decide
 * dónde subirlo (en producción → `/api/cron/db-backup` que llama a Vercel Blob;
 * en tests → un mock que recibe el buffer).
 */
export async function buildDatabaseDump(opts?: { now?: Date }): Promise<{
  tarGz: Buffer;
  metadata: {
    startedAt: string;
    finishedAt: string;
    totalRows: number;
    tables: Array<{ name: string; rows: number }>;
    schemaVersion: string;
  };
}> {
  const startedAt = (opts?.now ?? new Date()).toISOString();
  const tables = await listUserTables();

  const files: Array<{ name: string; content: string | Buffer }> = [];
  const tableSummary: Array<{ name: string; rows: number }> = [];
  let totalRows = 0;

  for (const t of tables) {
    const { jsonl, rows } = await dumpTableAsJsonl(t);
    files.push({ name: `data/${t}.jsonl`, content: jsonl });
    tableSummary.push({ name: t, rows });
    totalRows += rows;
  }

  // Última migración aplicada — sirve para confirmar al restaurar que el código
  // que se aplica con `prisma migrate deploy` corresponde al schema del dump.
  let schemaVersion = "unknown";
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ migration_name: string }>>(
      `SELECT migration_name FROM "_prisma_migrations"
       WHERE finished_at IS NOT NULL
       ORDER BY finished_at DESC LIMIT 1`
    );
    if (rows[0]?.migration_name) schemaVersion = rows[0].migration_name;
  } catch {
    // si no existe la tabla, dejamos "unknown"
  }

  const finishedAt = new Date().toISOString();
  const metadata = {
    startedAt,
    finishedAt,
    totalRows,
    tables: tableSummary,
    schemaVersion,
  };

  files.push({
    name: "metadata.json",
    content: JSON.stringify(metadata, null, 2),
  });

  const tarBuffer = buildTar(files);
  const tarGz = await gzipAsync(tarBuffer);

  return { tarGz, metadata };
}

/** Helper para nombrar el blob: `db-backups/YYYY-MM-DD.tar.gz` */
export function backupBlobPath(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `db-backups/${yyyy}-${mm}-${dd}.tar.gz`;
}
