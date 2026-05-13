/**
 * Tests del módulo de backup. NO toca Prisma ni Postgres — solo valida las
 * partes puras: el formato tar y el naming del blob.
 *
 * Cubrimos:
 *   - buildTar produce un tar válido que `tar -t` puede listar.
 *   - El padding a 512 bytes es correcto.
 *   - End-of-archive (2 bloques NUL finales).
 *   - backupBlobPath formatea como `db-backups/YYYY-MM-DD.tar.gz` con UTC.
 */

import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildTar, backupBlobPath } from "./db-backup";

describe("buildTar", () => {
  it("genera un tar parseable por `tar -t`", () => {
    const tar = buildTar([
      { name: "metadata.json", content: '{"foo":"bar"}' },
      { name: "data/users.jsonl", content: '{"id":"1","email":"a@b.com"}\n' },
    ]);

    // El tar mínimo debe terminar en 2 bloques NUL de 512 bytes
    expect(tar.length).toBeGreaterThanOrEqual(1024);
    const lastTwoBlocks = tar.subarray(tar.length - 1024);
    expect(lastTwoBlocks.every((b) => b === 0)).toBe(true);

    // Validamos con `tar -t` que sea legible
    const dir = mkdtempSync(join(tmpdir(), "tartest-"));
    const tarPath = join(dir, "out.tar");
    try {
      writeFileSync(tarPath, tar);
      const listing = execFileSync("tar", ["-tf", tarPath], { encoding: "utf-8" });
      expect(listing).toContain("metadata.json");
      expect(listing).toContain("data/users.jsonl");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("preserva el contenido exacto al desempaquetar", () => {
    const jsonlContent = '{"id":"1"}\n{"id":"2"}\n';
    const tar = buildTar([{ name: "data/x.jsonl", content: jsonlContent }]);

    const dir = mkdtempSync(join(tmpdir(), "tartest2-"));
    const tarPath = join(dir, "out.tar");
    try {
      writeFileSync(tarPath, tar);
      execFileSync("tar", ["-xf", tarPath, "-C", dir], { stdio: "ignore" });
      const extracted = execFileSync("cat", [join(dir, "data/x.jsonl")], {
        encoding: "utf-8",
      });
      expect(extracted).toBe(jsonlContent);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("maneja archivos vacíos (tabla sin filas)", () => {
    const tar = buildTar([{ name: "data/empty.jsonl", content: "" }]);
    expect(tar.length).toBeGreaterThan(1024); // header + 0 padding + 1024 NULs

    const dir = mkdtempSync(join(tmpdir(), "tartest3-"));
    const tarPath = join(dir, "out.tar");
    try {
      writeFileSync(tarPath, tar);
      const listing = execFileSync("tar", ["-tf", tarPath], { encoding: "utf-8" });
      expect(listing.trim()).toBe("data/empty.jsonl");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("backupBlobPath", () => {
  it("formatea como db-backups/YYYY-MM-DD.tar.gz", () => {
    expect(backupBlobPath(new Date("2026-05-13T03:00:00Z"))).toBe(
      "db-backups/2026-05-13.tar.gz"
    );
  });

  it("usa UTC, no la zona local", () => {
    // 2026-01-01 02:00 UTC = 2025-12-31 23:00 Santiago (UTC-3 sin DST)
    // Si usáramos zona local, daría 2025-12-31. Debe dar 2026-01-01.
    expect(backupBlobPath(new Date("2026-01-01T02:00:00Z"))).toBe(
      "db-backups/2026-01-01.tar.gz"
    );
  });

  it("paddea con ceros (mes y día < 10)", () => {
    expect(backupBlobPath(new Date("2026-03-05T12:00:00Z"))).toBe(
      "db-backups/2026-03-05.tar.gz"
    );
  });
});
