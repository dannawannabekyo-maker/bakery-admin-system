/**
 * Applies every SQL file in supabase/migrations (then optionally supabase/seed.sql)
 * to your database in one go — no Supabase CLI / Docker needed.
 *
 * Usage:
 *   node scripts/db-push.mjs           # migrations only
 *   node scripts/db-push.mjs --seed    # migrations + seed
 *
 * Requires a Postgres connection string in one of:
 *   SUPABASE_DB_URL   (preferred)   — Dashboard → Project Settings → Database →
 *                                     "Connection string" → URI (use the pooler
 *                                     or direct connection; include ?sslmode=require)
 *   DATABASE_URL
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Load .env.local manually (no dependency on dotenv).
try {
  const env = readFileSync(join(root, ".env.local"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
} catch {
  /* no .env.local — rely on real env */
}

const connectionString =
  process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    "\n✖ No database URL. Set SUPABASE_DB_URL in .env.local\n" +
      "  (Supabase Dashboard → Project Settings → Database → Connection string → URI)\n",
  );
  process.exit(1);
}

const withSeed = process.argv.includes("--seed");

const migrationsDir = join(root, "supabase", "migrations");
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log("• connected\n");

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    process.stdout.write(`→ ${file} ... `);
    await client.query(sql);
    console.log("ok");
  }

  if (withSeed) {
    const seed = readFileSync(join(root, "supabase", "seed.sql"), "utf8");
    process.stdout.write("→ seed.sql ... ");
    await client.query(seed);
    console.log("ok");
  }

  console.log("\n✔ database up to date");
} catch (err) {
  console.error("\n✖ failed:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
