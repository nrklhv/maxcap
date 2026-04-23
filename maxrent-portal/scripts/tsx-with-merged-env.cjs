/**
 * Runs tsx with DATABASE_URL merged from .env + .env.local (for seed and other TS scripts).
 */

const { spawnSync } = require("child_process");
const path = require("path");
const { applyMergedDatabaseUrl } = require("./merged-portal-env.cjs");

const root = path.join(__dirname, "..");
applyMergedDatabaseUrl(root);

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node scripts/tsx-with-merged-env.cjs <path-to-script.ts> [args...]");
  process.exit(1);
}

const result = spawnSync("npx", ["tsx", ...args], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status === null ? 1 : result.status);
