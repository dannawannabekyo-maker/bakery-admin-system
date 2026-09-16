-- Site-wide branding, admin-configurable (Admin > Appearance).
-- The logo is renamed since it's no longer receipt-only: it now also powers
-- the site header/nav across every dashboard and the shop, not just the
-- printed/WhatsApp nota (show_logo_on_receipt still gates the nota use).
-- Guarded (rather than a plain ALTER ... RENAME) because db-push.mjs re-runs
-- every migration file on every push with no migration-tracking table, and a
-- bare rename would fail the second time once receipt_logo_url is gone.
-- Handles all three possible states so it's safe to run repeatedly: only the
-- old column (clean rename), only the new one (no-op), or — seen in
-- practice, likely from a branch/PITR merge reintroducing the old column —
-- both at once (reconcile onto brand_logo_url, then drop the old one).
do $$
declare
  has_old boolean := exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'store_settings'
      and column_name = 'receipt_logo_url'
  );
  has_new boolean := exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'store_settings'
      and column_name = 'brand_logo_url'
  );
begin
  if has_old and not has_new then
    alter table store_settings rename column receipt_logo_url to brand_logo_url;
  elsif has_old and has_new then
    update store_settings set brand_logo_url = coalesce(brand_logo_url, receipt_logo_url);
    alter table store_settings drop column receipt_logo_url;
  end if;
end $$;

alter table store_settings
  add column if not exists store_name text not null default 'Allins Bakery',
  add column if not exists theme_primary_color text not null default '#a8547f';
