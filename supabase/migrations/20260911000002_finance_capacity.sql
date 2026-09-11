-- ============================================================================
-- Allins Bakery — 0008  Finance dashboard + inclusive tax + PO night capacity
--
-- Adds:
--   * role helpers  is_finance() / can_view_finance()
--   * store_settings.tax_rate (inclusive, default 11%) + daily_po_item_capacity
--   * orders.paid_at  (+ trigger to stamp it, + backfill)
--   * capital_entries / expenses  (Finance cash-flow inputs)
--   * finance_orders view          (gross -> net revenue + tax collected split)
--   * po_items_committed_on() / po_capacity_for()  (night-shift capacity)
--   * RLS for all of the above, incl. read access to orders for FINANCE
--
-- Fully idempotent — safe to replay via `npm run db:push`.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Role helpers  (SECURITY DEFINER so RLS on profiles can't recurse)
-- ----------------------------------------------------------------------------
create or replace function public.is_finance()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select role = 'FINANCE' from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ADMIN, FINANCE, or the service_role key (server jobs / God Mode)
create or replace function public.can_view_finance()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_admin()
      or public.is_finance()
      or coalesce(auth.jwt() ->> 'role', '') = 'service_role';
$$;

grant execute on function public.is_finance()       to authenticated;
grant execute on function public.can_view_finance() to authenticated;

-- ----------------------------------------------------------------------------
-- store_settings : inclusive tax rate + nightly PO item capacity
-- ----------------------------------------------------------------------------
alter table public.store_settings
  add column if not exists tax_rate numeric(5,4) not null default 0.1100
    check (tax_rate >= 0 and tax_rate < 1);

alter table public.store_settings
  add column if not exists daily_po_item_capacity integer not null default 200
    check (daily_po_item_capacity >= 0);

-- ----------------------------------------------------------------------------
-- orders.paid_at : when revenue is recognised (status first reaches PAID)
-- ----------------------------------------------------------------------------
alter table public.orders
  add column if not exists paid_at timestamptz;

create or replace function public.stamp_order_paid_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'PAID'
     and old.status is distinct from 'PAID'
     and new.paid_at is null then
    new.paid_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_orders_paid_at on public.orders;
create trigger trg_orders_paid_at
  before update on public.orders
  for each row execute function public.stamp_order_paid_at();

-- Backfill historical orders that are already (or past) PAID.
update public.orders
set paid_at = coalesce(updated_at, created_at)
where paid_at is null
  and status in ('PAID', 'IN_PRODUCTION', 'READY', 'COMPLETED');

-- ----------------------------------------------------------------------------
-- capital_entries : starting capital / cash injections (Finance-entered)
-- ----------------------------------------------------------------------------
create table if not exists public.capital_entries (
  id          uuid primary key default gen_random_uuid(),
  amount      integer not null check (amount > 0),          -- whole rupiah
  entry_date  date    not null default (now() at time zone 'Asia/Jakarta')::date,
  note        text,
  created_by  uuid    not null references public.profiles(id) on delete restrict,
  created_at  timestamptz not null default now()
);
create index if not exists capital_entries_entry_date_idx
  on public.capital_entries(entry_date desc);

-- ----------------------------------------------------------------------------
-- expenses : operational expenses (Finance-entered)
-- ----------------------------------------------------------------------------
create table if not exists public.expenses (
  id          uuid primary key default gen_random_uuid(),
  amount      integer not null check (amount > 0),          -- whole rupiah
  category    text    not null default 'OPERATIONAL',
  note        text,
  spent_at    date    not null default (now() at time zone 'Asia/Jakarta')::date,
  created_by  uuid    not null references public.profiles(id) on delete restrict,
  created_at  timestamptz not null default now()
);
create index if not exists expenses_spent_at_idx on public.expenses(spent_at desc);

-- ----------------------------------------------------------------------------
-- finance_orders : per-order gross -> (net revenue, tax collected) split.
--   Inclusive tax:  net = round(gross / (1 + rate)),  tax = gross - net
--   Only revenue-recognised statuses are included.
-- ----------------------------------------------------------------------------
create or replace view public.finance_orders as
select
  o.id,
  o.order_number,
  o.status,
  o.order_type,
  o.customer_id,
  o.created_at,
  o.pickup_or_delivery_date,
  coalesce(o.paid_at, o.updated_at, o.created_at)                    as recognised_at,
  o.total_amount                                                    as gross_amount,
  round(o.total_amount / (1 + s.tax_rate))::integer                 as net_amount,
  o.total_amount - round(o.total_amount / (1 + s.tax_rate))::integer as tax_amount,
  s.tax_rate                                                        as tax_rate
from public.orders o
cross join public.store_settings s
where o.status in ('PAID', 'IN_PRODUCTION', 'READY', 'COMPLETED');

-- Run the view with the CALLER's privileges so RLS on `orders` still applies.
alter view public.finance_orders set (security_invoker = on);

grant select on public.finance_orders to authenticated;

-- ----------------------------------------------------------------------------
-- Night-shift capacity : total PRE_ORDER item quantity committed for a date
-- ----------------------------------------------------------------------------
create or replace function public.po_items_committed_on(target date)
returns integer
language sql stable security definer set search_path = public
as $$
  select coalesce(sum(oi.quantity), 0)::integer
  from public.orders o
  join public.order_items oi on oi.order_id = o.id
  where o.order_type = 'PRE_ORDER'
    and o.status <> 'CANCELLED'
    and (o.pickup_or_delivery_date at time zone 'Asia/Jakarta')::date = target;
$$;

-- capacity / committed / remaining for one date
create or replace function public.po_capacity_for(target date)
returns table (capacity integer, committed integer, remaining integer)
language sql stable security definer set search_path = public
as $$
  select
    s.daily_po_item_capacity,
    public.po_items_committed_on(target),
    greatest(s.daily_po_item_capacity - public.po_items_committed_on(target), 0)
  from public.store_settings s
  where s.id = 1;
$$;

grant execute on function public.po_items_committed_on(date) to authenticated, anon;
grant execute on function public.po_capacity_for(date)       to authenticated, anon;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.capital_entries enable row level security;
alter table public.expenses        enable row level security;

-- capital_entries -----------------------------------------------------------
drop policy if exists capital_entries_read on public.capital_entries;
create policy capital_entries_read on public.capital_entries
  for select using (public.can_view_finance());

drop policy if exists capital_entries_insert on public.capital_entries;
create policy capital_entries_insert on public.capital_entries
  for insert with check (public.can_view_finance() and created_by = auth.uid());

drop policy if exists capital_entries_update on public.capital_entries;
create policy capital_entries_update on public.capital_entries
  for update using (public.can_view_finance()) with check (public.can_view_finance());

drop policy if exists capital_entries_delete on public.capital_entries;
create policy capital_entries_delete on public.capital_entries
  for delete using (public.can_view_finance());

-- expenses ----------------------------------------------------------------
drop policy if exists expenses_read on public.expenses;
create policy expenses_read on public.expenses
  for select using (public.can_view_finance());

drop policy if exists expenses_insert on public.expenses;
create policy expenses_insert on public.expenses
  for insert with check (public.can_view_finance() and created_by = auth.uid());

drop policy if exists expenses_update on public.expenses;
create policy expenses_update on public.expenses
  for update using (public.can_view_finance()) with check (public.can_view_finance());

drop policy if exists expenses_delete on public.expenses;
create policy expenses_delete on public.expenses
  for delete using (public.can_view_finance());

-- orders : FINANCE gets read-only visibility (for the recap + tax split) ----
drop policy if exists orders_select_finance on public.orders;
create policy orders_select_finance on public.orders
  for select using (public.is_finance());

-- order_items : add FINANCE to the existing read list ----------------------
drop policy if exists order_items_select on public.order_items;
create policy order_items_select on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
       where o.id = order_items.order_id
         and (
           o.customer_id = auth.uid()
           or o.created_by = auth.uid()
           or public.is_admin()
           or public.current_user_role() in ('SALES', 'PRODUCTION', 'FINANCE')
         )
    )
  );

-- profiles : add FINANCE to the staff read list ---------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (
    id = auth.uid()
    or public.is_admin()
    or public.current_user_role() in ('SALES', 'PRODUCTION', 'FINANCE')
  );

-- products : add FINANCE to the staff read list -------------------------
drop policy if exists products_select on public.products;
create policy products_select on public.products
  for select using (
    is_active = true
    or public.is_admin()
    or public.current_user_role() in ('SALES', 'PRODUCTION', 'FINANCE')
  );

-- store_settings : ADMIN + FINANCE may edit (tax rate, capacity, ...) -----
drop policy if exists store_settings_write on public.store_settings;
create policy store_settings_write on public.store_settings
  for all using (public.can_view_finance()) with check (public.can_view_finance());
