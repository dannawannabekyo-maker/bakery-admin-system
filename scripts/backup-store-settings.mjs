/**
 * Snapshots the single `store_settings` row to a local JSON file before a
 * risky migration/manual edit — cheap insurance since there's no pg_dump
 * available in every environment this runs in. Not a general-purpose DB
 * backup; store_settings is a single row, so this is intentionally narrow.
 *
 * Usage: npm run db:backup-settings
 * Requires SUPABASE_DB_URL / DATABASE_URL, same as scripts/db-push.mjs.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

try {
  const env = readFileSync(join(root, ".env.local"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
} catch {}

const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("No SUPABASE_DB_URL/DATABASE_URL found");
  process.exit(1);
}

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();
const res = await client.query("select * from store_settings");
await client.end();

const outPath = join(root, "scripts", `store_settings-backup-${Date.now()}.json`);
writeFileSync(outPath, JSON.stringify(res.rows, null, 2));
console.log("Backed up", res.rows.length, "row(s) to", outPath);
console.log(JSON.stringify(res.rows, null, 2));
