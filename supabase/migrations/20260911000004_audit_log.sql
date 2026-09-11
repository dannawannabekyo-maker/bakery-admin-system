-- ============================================================================
-- Allins Bakery — 0010  Audit log
--
-- Gives Admin visibility into what every other account does: logins,
-- order status changes, product/price/category edits, user management,
-- finance entries (capital/expenses/settings). Written exclusively via the
-- service-role client (see src/lib/audit.ts), so the insert policy below is
-- defense-in-depth rather than the actual access gate.
--
-- Idempotent — safe to replay via `npm run db:push`.
-- ============================================================================

create table if not exists public.audit_log (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid references public.profiles(id) on delete set null,
  actor_name   text,
  actor_role   public.user_role,
  action       text not null,        -- e.g. 'ORDER_STATUS_CHANGE', 'PRODUCT_UPDATE'
  entity_type  text not null,        -- 'order' | 'product' | 'category' | 'profile' | ...
  entity_id    text,
  summary      text not null,        -- human-readable one-liner
  metadata     jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists audit_log_created_at_idx on public.audit_log(created_at desc);
create index if not exists audit_log_entity_idx on public.audit_log(entity_type, entity_id);
create index if not exists audit_log_actor_idx on public.audit_log(actor_id);

alter table public.audit_log enable row level security;

-- Admin-only read: this IS the "admin sees what every other account does" view.
drop policy if exists audit_log_select_admin on public.audit_log;
create policy audit_log_select_admin on public.audit_log
  for select using (public.is_admin());

-- Writes only ever come from the service-role client (bypasses RLS anyway);
-- this just documents/limits intent if a non-privileged path is added later.
drop policy if exists audit_log_insert on public.audit_log;
create policy audit_log_insert on public.audit_log
  for insert with check (public.is_privileged());

-- Append-only: nobody may edit or erase the trail (not even Admin) via the API.
drop policy if exists audit_log_no_update on public.audit_log;
create policy audit_log_no_update on public.audit_log
  for update using (false);

drop policy if exists audit_log_no_delete on public.audit_log;
create policy audit_log_no_delete on public.audit_log
  for delete using (false);
