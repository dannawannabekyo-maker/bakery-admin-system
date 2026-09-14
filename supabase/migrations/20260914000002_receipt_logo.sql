-- Lets Admin/Finance upload their own receipt logo from the dashboard instead
-- of a developer editing /public/logo.svg. Null = fall back to that default.
alter table store_settings
  add column if not exists receipt_logo_url text;
