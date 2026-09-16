-- Guest checkout: let a walk-in/online customer place an order without an
-- account (name + phone only). customer_id/created_by become nullable;
-- guest_name/guest_phone capture who a guest order is for. A check
-- constraint keeps every order attributable to either a real account or a
-- named guest, never neither.
--
-- Guest orders are written by the server action using the service-role
-- client (bypasses RLS, like Admin/Sales manual orders already do) — no new
-- anon INSERT policy needed. Staff already see every order regardless of
-- customer_id via the role-based SELECT policies (is_sales_team()/is_admin()),
-- so guest orders show up in the existing Incoming Orders queue unchanged.
alter table public.orders
  alter column customer_id drop not null,
  alter column created_by drop not null,
  add column if not exists guest_name text,
  add column if not exists guest_phone text;

alter table public.orders
  drop constraint if exists orders_customer_or_guest_chk;
alter table public.orders
  add constraint orders_customer_or_guest_chk check (
    customer_id is not null or (guest_name is not null and guest_phone is not null)
  );
