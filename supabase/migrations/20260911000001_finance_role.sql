-- ============================================================================
-- Allins Bakery — 0007  Add the FINANCE user role
--
-- Kept in its OWN migration file on purpose: Postgres will not let a newly
-- added enum value be referenced in the same transaction it was created in,
-- and db-push runs each file in a single transaction. Everything that USES
-- 'FINANCE' lives in 0008 (the next file).
--
-- NOTE: if SUPABASE_DB_URL points at the transaction-mode pooler (port 6543),
-- `ALTER TYPE ... ADD VALUE` can fail with "cannot run inside a transaction
-- block". Use the direct connection (port 5432) or the session pooler for
-- this one push. Idempotent via IF NOT EXISTS.
-- ============================================================================

alter type public.user_role add value if not exists 'FINANCE';
