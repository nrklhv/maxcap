/**
 * Runs Prisma CLI with DATABASE_URL merged from .env + .env.local (same rules as Next dev).
 */

const { spawnSync } = require("child_process");
const path = require("path");
const { applyMergedDatabaseUrl } = require("./merged-portal-env.cjs");

const root = path.join(__dirname, "..");

const applied = applyMergedDatabaseUrl(root);
if (!applied) {
  console.error("No DATABASE_URL after merging .env and .env.local.");
  process.exit(1);
}

const prismaArgs = process.argv.slice(2);
if (prismaArgs.length === 0) {
  console.error("Usage: node scripts/prisma-with-merged-env.cjs <prisma args...>");
  console.error("Example: node scripts/prisma-with-merged-env.cjs db push");
  process.exit(1);
}

const result = spawnSync("npx", ["prisma", ...prismaArgs], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status === null ? 1 : result.status);
