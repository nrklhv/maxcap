/**
 * Writes merged DATABASE_URL into maxrent-portal/.env (line replace only — preserves other keys).
 */

const fs = require("fs");
const path = require("path");
const { getMergedDatabaseUrl } = require("./merged-portal-env.cjs");

const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env");

const merged = getMergedDatabaseUrl(root);
if (!merged) {
  console.error("No DATABASE_URL found in .env, .env.local, or ../.env");
  process.exit(1);
}

const canonical = merged.trim();
const line = `DATABASE_URL=${canonical}`;

let body = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
const lines = body.length ? body.split(/\r?\n/) : [];
let found = false;
const out = lines.map((l) => {
  if (/^\s*DATABASE_URL=/.test(l)) {
    found = true;
    return line;
  }
  return l;
});
if (!found) out.push(line);
const written = `${out.join("\n").replace(/\n+$/, "")}\n`;
fs.writeFileSync(envPath, written, "utf8");
console.log("Updated maxrent-portal/.env DATABASE_URL line (other lines preserved).");
console.log("Preview:", canonical.replace(/:[^:@]+@/, ":***@"));
