-- ============================================================================
-- Allins Bakery — 0009  Efficiency pass: targeted indexes + Realtime on orders
--
-- Idempotent — safe to replay via `npm run db:push`.
-- ============================================================================

-- Matches finance_orders.recognised_at = coalesce(paid_at, updated_at, created_at)
-- so the Finance recap/report date-range filters can use an index once order
-- volume grows past a trivial scan.
create index if not exists orders_recognised_at_idx
  on public.orders (coalesce(paid_at, updated_at, created_at));

-- Matches the capacity (po_items_committed_on/getDateLoads) and night-board
-- (getNightBoard/listNightDates) queries: PRE_ORDER + status + date range.
create index if not exists orders_capacity_lookup_idx
  on public.orders (order_type, status, pickup_or_delivery_date);

-- ----------------------------------------------------------------------------
-- Realtime: let Sales/Production dashboards refresh live instead of on
-- manual reload. Postgres Changes still goes through the existing RLS
-- policies on `orders`, so nobody sees more than they already could query.
-- Skips quietly if this project's `supabase_realtime` publication isn't
-- present (e.g. different Supabase tier/setup) rather than failing the push.
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'orders'
  ) then
    execute 'alter publication supabase_realtime add table public.orders';
  end if;
exception when undefined_object then
  null; -- no supabase_realtime publication on this project — skip
end $$;
