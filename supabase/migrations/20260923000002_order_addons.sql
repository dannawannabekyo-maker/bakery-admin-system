-- Custom add-ons per order: Paket (a bundle of several products), Bingkisan /
-- Goodybag / Parcel, or any other free-form extra line. Added by ADMIN and
-- the Sales team when taking an order.
--
-- Lives in its OWN table (not order_items) on purpose: order_items is read by
-- the stock trigger, the nightly PO capacity count and the kitchen board, and
-- an add-on is billing-only — it must never touch stock or capacity.
-- `contents` is a descriptive snapshot ([{name, quantity}]) of what is inside
-- a package; it is not linked to products and deducts nothing.
create table if not exists public.order_addons (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders(id) on delete cascade,
  kind             text not null default 'PAKET'
                     check (kind in ('PAKET', 'BINGKISAN', 'LAINNYA')),
  name             text not null check (length(btrim(name)) > 0),
  description      text,
  contents         jsonb not null default '[]'::jsonb,
  quantity         integer not null default 1 check (quantity > 0),
  unit_price       integer not null default 0 check (unit_price >= 0),
  subtotal         integer not null default 0 check (subtotal >= 0),
  show_on_receipt  boolean not null default true,
  created_at       timestamptz not null default now()
);

create index if not exists order_addons_order_id_idx
  on public.order_addons(order_id);

alter table public.order_addons enable row level security;

-- read: anyone who can read the parent order's items (customer sees own nota)
drop policy if exists order_addons_select on public.order_addons;
create policy order_addons_select on public.order_addons
  for select using (
    exists (
      select 1 from public.orders o
       where o.id = order_addons.order_id
         and (
           o.customer_id = auth.uid()
           or o.created_by = auth.uid()
           or public.is_admin()
           or public.current_user_role() in ('PRODUCTION', 'FINANCE')
           or public.is_sales_team()
         )
    )
  );

-- write: ADMIN and the Sales team only (customers cannot add their own)
drop policy if exists order_addons_insert on public.order_addons;
create policy order_addons_insert on public.order_addons
  for insert with check (public.is_admin() or public.is_sales_team());

drop policy if exists order_addons_modify on public.order_addons;
create policy order_addons_modify on public.order_addons
  for update using (public.is_admin() or public.is_sales_team())
  with check (public.is_admin() or public.is_sales_team());

drop policy if exists order_addons_delete on public.order_addons;
create policy order_addons_delete on public.order_addons
  for delete using (public.is_admin() or public.is_sales_team());

-- Order total = product lines + add-ons.
create or replace function public.recalc_order_total(p_order_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_total integer;
begin
  select
    coalesce((select sum(subtotal) from public.order_items  where order_id = p_order_id), 0)
  + coalesce((select sum(subtotal) from public.order_addons where order_id = p_order_id), 0)
    into new_total;

  update public.orders set total_amount = new_total where id = p_order_id;
  return new_total;
end;
$$;

grant execute on function public.recalc_order_total(uuid) to authenticated;
