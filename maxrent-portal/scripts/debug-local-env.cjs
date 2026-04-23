/**
 * Diagnoses local DATABASE_URL resolution and Prisma connectivity.
 * Run: npm run debug:db
 */

const path = require("path");
const {
  applyMergedDatabaseUrl,
  getMergedDatabaseUrl,
} = require("./merged-portal-env.cjs");

const root = path.join(__dirname, "..");
process.chdir(root);

function maskDatabaseUrl(url) {
  try {
    const u = new URL(url);
    const hasPassword = Boolean(u.password);
    return {
      hostname: u.hostname,
      port: u.port || "default",
      pathname: u.pathname,
      username: u.username || "(none)",
      passwordPresent: hasPassword,
    };
  } catch {
    return { parseError: "URL.parse failed" };
  }
}

async function main() {
  const mergedUrl = getMergedDatabaseUrl(root);
  if (!mergedUrl) {
    console.error(
      "No DATABASE_URL: set it in maxrent-portal/.env and/or .env.local."
    );
    process.exit(1);
  }

  applyMergedDatabaseUrl(root);
  const mask = maskDatabaseUrl(mergedUrl);
  const looksLikeExampleUser =
    mask.username === "user" &&
    mergedUrl.includes("localhost") &&
    mask.passwordPresent;
  if (looksLikeExampleUser) {
    console.error(
      'DATABASE_URL still uses the example user "user". Use your real Postgres role or Railway URL.'
    );
    process.exit(1);
  }

  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1 as ok`;
    console.log("OK: Prisma connected.", mask);
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("Prisma connect failed:", err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main();
