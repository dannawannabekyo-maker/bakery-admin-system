/**
 * Create (or promote) a user via the Supabase Admin API — handy for bootstrapping
 * the very first ADMIN before the in-app User Management screen exists.
 *
 * Usage:
 *   node scripts/create-user.mjs <email> <password> <ROLE> "<Full Name>" [phone]
 * Example:
 *   node scripts/create-user.mjs owner@bakery.test "Str0ng!Pass" ADMIN "Bakery Owner" 0811111111
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
try {
  for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}

const [, , email, password, role = "CUSTOMER", fullName = "", phone = ""] =
  process.argv;

if (!email || !password) {
  console.error(
    'Usage: node scripts/create-user.mjs <email> <password> <ROLE> "<Full Name>" [phone]',
  );
  process.exit(1);
}
if (!["ADMIN", "SALES", "PRODUCTION", "CUSTOMER"].includes(role)) {
  console.error("ROLE must be one of ADMIN | SALES | PRODUCTION | CUSTOMER");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: fullName, phone_number: phone, role },
});

if (error) {
  console.error("✖", error.message);
  process.exit(1);
}

// handle_new_user() creates the profile; make sure the role sticks.
const { error: pErr } = await admin
  .from("profiles")
  .update({ role, full_name: fullName, phone_number: phone || null })
  .eq("id", data.user.id);

if (pErr) console.warn("! profile update:", pErr.message);

console.log(`✔ ${email} created as ${role} (id ${data.user.id})`);
