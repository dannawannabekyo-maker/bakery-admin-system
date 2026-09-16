-- Site-wide branding, admin-configurable (Admin > Appearance).
-- The logo is renamed since it's no longer receipt-only: it now also powers
-- the site header/nav across every dashboard and the shop, not just the
-- printed/WhatsApp nota (show_logo_on_receipt still gates the nota use).
-- Guarded (rather than a plain ALTER ... RENAME) because db-push.mjs re-runs
-- every migration file on every push with no migration-tracking table, and a
-- bare rename would fail the second time once receipt_logo_url is gone.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'store_settings'
      and column_name = 'receipt_logo_url'
  ) then
    alter table store_settings rename column receipt_logo_url to brand_logo_url;
  end if;
end $$;

alter table store_settings
  add column if not exists store_name text not null default 'Allins Bakery',
  add column if not exists theme_primary_color text not null default '#a8547f';
