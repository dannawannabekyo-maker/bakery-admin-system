-- Global receipt toggles shown on the client-generated PDF/WhatsApp nota.
-- The PDF itself is never stored — only these on/off preferences persist.
alter table store_settings
  add column if not exists show_tax_on_receipt boolean not null default true,
  add column if not exists show_logo_on_receipt boolean not null default true,
  add column if not exists show_po_instructions boolean not null default true;
