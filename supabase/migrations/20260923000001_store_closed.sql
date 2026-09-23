-- Admin-configurable "store closed" state (Admin > Appearance). Blocks new
-- CUSTOMER-FACING orders only — /checkout and /checkout/guest — same as the
-- existing bypassCapacity precedent for staff: Sales/Admin manual order entry
-- (phone/walk-in orders) is untouched, since closing the storefront doesn't
-- mean staff can't still log an order they've already agreed with someone.
alter table public.store_settings
  add column if not exists store_closed boolean not null default false,
  add column if not exists store_closed_message text,
  add column if not exists store_closed_until date;
