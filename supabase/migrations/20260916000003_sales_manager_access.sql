-- Grants SALES_MANAGER the same order-handling RLS/trigger rights as SALES
-- (see 20260916000002 for why the enum value needed its own file first).
-- Finance-only tables (capital_entries, expenses, store_settings writes) are
-- deliberately left untouched here — Sales Manager stays separate from
-- Finance, per the app's role model.

create or replace function public.is_sales_team()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.current_user_role() in ('SALES', 'SALES_MANAGER');
$$;
grant execute on function public.is_sales_team() to authenticated;

-- orders : SALES_MANAGER sees/acts on every order, same as SALES
drop policy if exists orders_select_sales on public.orders;
create policy orders_select_sales on public.orders
  for select using (public.is_sales_team());

drop policy if exists orders_insert_staff on public.orders;
create policy orders_insert_staff on public.orders
  for insert with check (
    public.is_admin()
    or (public.is_sales_team() and created_by = auth.uid())
  );

drop policy if exists orders_update_sales on public.orders;
create policy orders_update_sales on public.orders
  for update using (public.is_sales_team())
  with check (public.is_sales_team());

-- order_items : visibility/writability follow the parent order, same as SALES
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
           or public.current_user_role() in ('PRODUCTION', 'FINANCE')
           or public.is_sales_team()
         )
    )
  );

drop policy if exists order_items_insert on public.order_items;
create policy order_items_insert on public.order_items
  for insert with check (
    public.is_admin()
    or exists (
      select 1 from public.orders o
       where o.id = order_items.order_id
         and (
           (o.created_by = auth.uid() and o.status = 'UNPAID')
           or public.is_sales_team()
         )
    )
  );

drop policy if exists order_items_modify on public.order_items;
create policy order_items_modify on public.order_items
  for update using (
    public.is_admin()
    or exists (
      select 1 from public.orders o
       where o.id = order_items.order_id
         and ((o.created_by = auth.uid() and o.status = 'UNPAID')
              or public.is_sales_team())
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.orders o
       where o.id = order_items.order_id
         and ((o.created_by = auth.uid() and o.status = 'UNPAID')
              or public.is_sales_team())
    )
  );

drop policy if exists order_items_delete on public.order_items;
create policy order_items_delete on public.order_items
  for delete using (
    public.is_admin()
    or exists (
      select 1 from public.orders o
       where o.id = order_items.order_id
         and ((o.created_by = auth.uid() and o.status = 'UNPAID')
              or public.is_sales_team())
    )
  );

-- profiles : staff read list
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (
    id = auth.uid()
    or public.is_admin()
    or public.current_user_role() in ('PRODUCTION', 'FINANCE')
    or public.is_sales_team()
  );

-- products : staff read list
drop policy if exists products_select on public.products;
create policy products_select on public.products
  for select using (
    is_active = true
    or public.is_admin()
    or public.current_user_role() in ('PRODUCTION', 'FINANCE')
    or public.is_sales_team()
  );

-- storage: payment-receipts — staff read/write, same as SALES
drop policy if exists "receipts owner read" on storage.objects;
create policy "receipts owner read" on storage.objects
  for select using (
    bucket_id = 'payment-receipts'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
      or public.current_user_role() = 'PRODUCTION'
      or public.is_sales_team()
    )
  );

drop policy if exists "receipts owner write" on storage.objects;
create policy "receipts owner write" on storage.objects
  for insert with check (
    bucket_id = 'payment-receipts'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
      or public.is_sales_team()
    )
  );

-- order status transition trigger: SALES_MANAGER gets the same transition
-- rights as SALES (verify/mark-paid/cancel/advance).
create or replace function public.enforce_order_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.user_role := public.current_user_role();
begin
  -- God Mode
  if public.is_privileged() then
    return new;
  end if;

  -- No status change -> allow (other column edits handled by RLS)
  if new.status is not distinct from old.status then
    return new;
  end if;

  if actor = 'PRODUCTION' then
    -- Kitchen may ONLY walk Paid -> In Production -> Ready
    if not (
      (old.status = 'PAID'          and new.status = 'IN_PRODUCTION') or
      (old.status = 'IN_PRODUCTION' and new.status = 'READY')
    ) then
      raise exception 'Production may only move orders PAID -> IN_PRODUCTION -> READY (got % -> %)',
        old.status, new.status;
    end if;
    -- and may not touch money / dates
    if new.total_amount is distinct from old.total_amount
       or new.customer_id is distinct from old.customer_id
       or new.order_type is distinct from old.order_type then
      raise exception 'Production may only update order status';
    end if;
    return new;

  elsif actor in ('SALES', 'SALES_MANAGER') then
    if not (
      (old.status = 'UNPAID'        and new.status in ('PAID', 'CANCELLED')) or
      (old.status = 'PAID'          and new.status in ('IN_PRODUCTION', 'CANCELLED')) or
      (old.status = 'IN_PRODUCTION' and new.status in ('READY', 'CANCELLED')) or
      (old.status = 'READY'         and new.status in ('COMPLETED', 'CANCELLED'))
    ) then
      raise exception 'Illegal status transition for Sales: % -> %', old.status, new.status;
    end if;
    return new;

  elsif actor = 'CUSTOMER' then
    -- customer may only cancel their own still-unpaid order
    if not (old.status = 'UNPAID' and new.status = 'CANCELLED') then
      raise exception 'Customers may only cancel an unpaid order';
    end if;
    return new;
  end if;

  raise exception 'Not permitted to change order status';
end;
$$;

drop trigger if exists trg_orders_transition on public.orders;
create trigger trg_orders_transition
  before update on public.orders
  for each row execute function public.enforce_order_transition();
