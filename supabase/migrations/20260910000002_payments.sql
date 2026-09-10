-- ============================================================================
-- Allins Bakery — 0006  Manual payments: store payment settings + proof metadata
--
-- The owner collects money via a static QRIS image and a bank transfer. This
-- adds a single-row settings table for those details and a timestamp on orders
-- that marks "customer has submitted proof, awaiting Sales/Admin verification".
-- No new order status: awaiting = (status = 'UNPAID' AND payment_submitted_at IS NOT NULL).
-- Idempotent — safe to replay.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- store_settings : exactly one row (id = 1)
-- ----------------------------------------------------------------------------
create table if not exists public.store_settings (
  id                   smallint primary key default 1 check (id = 1),
  qris_image_url       text,
  qris_merchant_name   text,
  bank_name            text,
  bank_account_number  text,
  bank_account_holder  text,
  payment_note         text,
  updated_at           timestamptz not null default now()
);

insert into public.store_settings (id) values (1) on conflict (id) do nothing;

alter table public.store_settings enable row level security;

drop policy if exists store_settings_read on public.store_settings;
create policy store_settings_read on public.store_settings
  for select using (true);          -- payment details are shown at checkout

drop policy if exists store_settings_write on public.store_settings;
create policy store_settings_write on public.store_settings
  for all using (public.is_admin()) with check (public.is_admin());

drop trigger if exists trg_store_settings_updated_at on public.store_settings;
create trigger trg_store_settings_updated_at
  before update on public.store_settings
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- orders : when the customer uploaded proof of payment
-- ----------------------------------------------------------------------------
alter table public.orders
  add column if not exists payment_submitted_at timestamptz;
