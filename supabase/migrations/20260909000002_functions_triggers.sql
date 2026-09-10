-- ============================================================================
-- Bakery Order & Administration System — 0002 FUNCTIONS & TRIGGERS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Role helpers (SECURITY DEFINER so RLS on profiles can't recurse)
-- ----------------------------------------------------------------------------
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'ADMIN' from public.profiles where id = auth.uid()),
    false
  );
$$;

-- true for ADMIN users AND for the service_role key (God Mode / server jobs)
create or replace function public.is_privileged()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
      or coalesce(auth.jwt() ->> 'role', '') = 'service_role';
$$;

-- ----------------------------------------------------------------------------
-- New auth user -> profile row
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone_number, role, address)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone_number', ''),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'CUSTOMER'),
    nullif(new.raw_user_meta_data ->> 'address', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Guard: only privileged callers may change a profile's role
-- ----------------------------------------------------------------------------
create or replace function public.enforce_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_privileged() then
    raise exception 'Only an administrator may change a user role';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_role_guard on public.profiles;
create trigger trg_profiles_role_guard
  before update on public.profiles
  for each row execute function public.enforce_profile_role_change();

-- ----------------------------------------------------------------------------
-- updated_at maintenance
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- order_number generation:  ORD-YYYYMMDD-XXXXX  (retry on collision)
-- ----------------------------------------------------------------------------
create or replace function public.generate_order_number()
returns trigger
language plpgsql
as $$
declare
  candidate text;
  tries     int := 0;
begin
  if new.order_number is not null and length(trim(new.order_number)) > 0 then
    return new;
  end if;

  loop
    candidate := 'ORD-' || to_char(now(), 'YYYYMMDD') || '-' ||
                 lpad((floor(random() * 100000))::int::text, 5, '0');
    exit when not exists (select 1 from public.orders where order_number = candidate);
    tries := tries + 1;
    if tries > 20 then
      candidate := 'ORD-' || to_char(now(), 'YYYYMMDD') || '-' ||
                   replace(gen_random_uuid()::text, '-', '');
      exit;
    end if;
  end loop;

  new.order_number := candidate;
  return new;
end;
$$;

drop trigger if exists trg_orders_order_number on public.orders;
create trigger trg_orders_order_number
  before insert on public.orders
  for each row execute function public.generate_order_number();

-- ----------------------------------------------------------------------------
-- Status-transition rules for NON-privileged actors.
-- ADMIN + service_role bypass entirely (God Mode: any edit, any transition).
-- ----------------------------------------------------------------------------
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

  elsif actor = 'SALES' then
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

-- ----------------------------------------------------------------------------
-- Stock movement on payment / cancellation  (READY_STOCK products only)
--   * status -> PAID           : deduct stock
--   * PAID/IN_PROD/READY -> CANCELLED : restock
-- ----------------------------------------------------------------------------
create or replace function public.apply_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Payment confirmed
  if new.status = 'PAID' and old.status is distinct from 'PAID' then
    update public.products p
       set stock = greatest(p.stock - oi.qty, 0)
      from (
        select product_id, sum(quantity)::int as qty
          from public.order_items
         where order_id = new.id
         group by product_id
      ) oi
     where p.id = oi.product_id
       and p.is_preorder = false;

  -- Order cancelled after having been paid -> put stock back
  elsif new.status = 'CANCELLED'
        and old.status in ('PAID', 'IN_PRODUCTION', 'READY') then
    update public.products p
       set stock = p.stock + oi.qty
      from (
        select product_id, sum(quantity)::int as qty
          from public.order_items
         where order_id = new.id
         group by product_id
      ) oi
     where p.id = oi.product_id
       and p.is_preorder = false;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_orders_stock_movement on public.orders;
create trigger trg_orders_stock_movement
  after update on public.orders
  for each row execute function public.apply_stock_movement();

-- ----------------------------------------------------------------------------
-- Recalculate an order's total from its items (helper for server actions)
-- ----------------------------------------------------------------------------
create or replace function public.recalc_order_total(p_order_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_total integer;
begin
  select coalesce(sum(subtotal), 0) into new_total
    from public.order_items where order_id = p_order_id;

  update public.orders set total_amount = new_total where id = p_order_id;
  return new_total;
end;
$$;

grant execute on function public.recalc_order_total(uuid) to authenticated;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
