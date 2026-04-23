/**
 * Merges maxrent-portal/.env then .env.local (local wins), with optional fallback to monorepo ../.env for DATABASE_URL.
 * Matches how Next.js loads env for dev — Prisma CLI alone only reads .env, so CLI commands use a wrapper that calls this first.
 */

const fs = require("fs");
const path = require("path");

function parseDotEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

/**
 * @param {string} portalRoot absolute path to maxrent-portal
 * @returns {string|undefined}
 */
function getMergedDatabaseUrl(portalRoot) {
  const portalEnv = parseDotEnvFile(path.join(portalRoot, ".env"));
  const portalLocal = parseDotEnvFile(path.join(portalRoot, ".env.local"));
  const monorepoEnv = parseDotEnvFile(path.join(portalRoot, "..", ".env"));
  const merged = { ...portalEnv, ...portalLocal };
  if (!merged.DATABASE_URL && monorepoEnv.DATABASE_URL) {
    merged.DATABASE_URL = monorepoEnv.DATABASE_URL;
  }
  return merged.DATABASE_URL;
}

function normalizeDatabaseUrl(url) {
  return typeof url === "string" ? url.trim() : "";
}

function warnDatabaseUrlConflict(portalRoot) {
  const portalEnv = parseDotEnvFile(path.join(portalRoot, ".env"));
  const portalLocal = parseDotEnvFile(path.join(portalRoot, ".env.local"));
  const a = normalizeDatabaseUrl(portalEnv.DATABASE_URL);
  const b = normalizeDatabaseUrl(portalLocal.DATABASE_URL);
  if (a && b && a !== b) {
    console.warn(
      "[maxrent-portal] DATABASE_URL differs between .env and .env.local — using .env.local. " +
        "Run `npm run env:align-db` to copy the effective URL into .env, or edit manually."
    );
  }
}

/**
 * Sets process.env.DATABASE_URL from merged portal env files.
 * @param {string} portalRoot
 * @returns {string|undefined} applied URL
 */
function applyMergedDatabaseUrl(portalRoot) {
  warnDatabaseUrlConflict(portalRoot);
  const url = getMergedDatabaseUrl(portalRoot);
  if (url) process.env.DATABASE_URL = url;
  return url;
}

module.exports = {
  parseDotEnvFile,
  getMergedDatabaseUrl,
  applyMergedDatabaseUrl,
  warnDatabaseUrlConflict,
};
