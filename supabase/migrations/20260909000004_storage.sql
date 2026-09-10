-- ============================================================================
-- Bakery Order & Administration System — 0004 STORAGE BUCKETS & POLICIES
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('payment-receipts', 'payment-receipts', false)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- product-images : public read, admin write
-- ----------------------------------------------------------------------------
drop policy if exists "product images are public" on storage.objects;
create policy "product images are public" on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists "admins manage product images" on storage.objects;
create policy "admins manage product images" on storage.objects
  for all using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

-- ----------------------------------------------------------------------------
-- payment-receipts : a user reads/writes only their own folder (<uid>/...);
-- staff + admin may read all.
-- ----------------------------------------------------------------------------
drop policy if exists "receipts owner read" on storage.objects;
create policy "receipts owner read" on storage.objects
  for select using (
    bucket_id = 'payment-receipts'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
      or public.current_user_role() in ('SALES', 'PRODUCTION')
    )
  );

drop policy if exists "receipts owner write" on storage.objects;
create policy "receipts owner write" on storage.objects
  for insert with check (
    bucket_id = 'payment-receipts'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
      or public.current_user_role() = 'SALES'
    )
  );
