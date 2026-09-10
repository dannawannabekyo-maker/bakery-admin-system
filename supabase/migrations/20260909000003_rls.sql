-- ============================================================================
-- Bakery Order & Administration System — 0003 ROW LEVEL SECURITY
--
-- The service_role key (used by Admin "God Mode" server code) bypasses RLS
-- automatically. ADMIN users additionally get full access here via is_admin().
-- ============================================================================

alter table public.profiles     enable row level security;
alter table public.categories   enable row level security;
alter table public.products     enable row level security;
alter table public.orders       enable row level security;
alter table public.order_items  enable row level security;

-- ----------------------------------------------------------------------------
-- PROFILES
-- ----------------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (
    id = auth.uid()
    or public.is_admin()
    or public.current_user_role() in ('SALES', 'PRODUCTION')
  );

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert with check (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
  -- (role escalation is blocked by trg_profiles_role_guard)

drop policy if exists profiles_delete_admin on public.profiles;
create policy profiles_delete_admin on public.profiles
  for delete using (public.is_admin());

-- ----------------------------------------------------------------------------
-- CATEGORIES  — world-readable, admin-writable
-- ----------------------------------------------------------------------------
drop policy if exists categories_select on public.categories;
create policy categories_select on public.categories
  for select using (true);

drop policy if exists categories_write on public.categories;
create policy categories_write on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- PRODUCTS
--   customers/anon: only active products
--   staff/admin:    everything
--   writes:         admin only
-- ----------------------------------------------------------------------------
drop policy if exists products_select on public.products;
create policy products_select on public.products
  for select using (
    is_active = true
    or public.is_admin()
    or public.current_user_role() in ('SALES', 'PRODUCTION')
  );

drop policy if exists products_write on public.products;
create policy products_write on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- ORDERS
-- ----------------------------------------------------------------------------
-- SELECT
drop policy if exists orders_select_own on public.orders;
create policy orders_select_own on public.orders
  for select using (customer_id = auth.uid() or created_by = auth.uid());

drop policy if exists orders_select_admin on public.orders;
create policy orders_select_admin on public.orders
  for select using (public.is_admin());

drop policy if exists orders_select_sales on public.orders;
create policy orders_select_sales on public.orders
  for select using (public.current_user_role() = 'SALES');

drop policy if exists orders_select_production on public.orders;
create policy orders_select_production on public.orders
  for select using (
    public.current_user_role() = 'PRODUCTION'
    and status in ('PAID', 'IN_PRODUCTION', 'READY')
  );

-- INSERT
drop policy if exists orders_insert_customer on public.orders;
create policy orders_insert_customer on public.orders
  for insert with check (
    customer_id = auth.uid() and created_by = auth.uid()
    and status = 'UNPAID'
  );

drop policy if exists orders_insert_staff on public.orders;
create policy orders_insert_staff on public.orders
  for insert with check (
    public.is_admin()
    or (public.current_user_role() = 'SALES' and created_by = auth.uid())
  );

-- UPDATE  (transition legality further enforced by trg_orders_transition)
drop policy if exists orders_update_customer on public.orders;
create policy orders_update_customer on public.orders
  for update using (customer_id = auth.uid() and status = 'UNPAID')
  with check (customer_id = auth.uid() and status in ('UNPAID', 'CANCELLED'));

drop policy if exists orders_update_sales on public.orders;
create policy orders_update_sales on public.orders
  for update using (public.current_user_role() = 'SALES')
  with check (public.current_user_role() = 'SALES');

drop policy if exists orders_update_production on public.orders;
create policy orders_update_production on public.orders
  for update using (
    public.current_user_role() = 'PRODUCTION'
    and status in ('PAID', 'IN_PRODUCTION')
  )
  with check (
    public.current_user_role() = 'PRODUCTION'
    and status in ('IN_PRODUCTION', 'READY')
  );

drop policy if exists orders_update_admin on public.orders;
create policy orders_update_admin on public.orders
  for update using (public.is_admin()) with check (public.is_admin());

-- DELETE — admin only
drop policy if exists orders_delete_admin on public.orders;
create policy orders_delete_admin on public.orders
  for delete using (public.is_admin());

-- ----------------------------------------------------------------------------
-- ORDER_ITEMS — visibility & writability follow the parent order
-- ----------------------------------------------------------------------------
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
           or public.current_user_role() in ('SALES', 'PRODUCTION')
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
           or public.current_user_role() = 'SALES'
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
              or public.current_user_role() = 'SALES')
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.orders o
       where o.id = order_items.order_id
         and ((o.created_by = auth.uid() and o.status = 'UNPAID')
              or public.current_user_role() = 'SALES')
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
              or public.current_user_role() = 'SALES')
    )
  );
