-- Admin-configured WhatsApp contact shown on the public shop front page, for
-- customers (especially guests) who need help. Deliberately not derived from
-- any Sales/Sales Manager account — see 20260916000003's notes on role
-- design: a staff roster can be empty, ambiguous (several managers), or just
-- not the number the business wants publicised.
alter table public.store_settings
  add column if not exists sales_whatsapp_number text,
  add column if not exists sales_whatsapp_label text;
