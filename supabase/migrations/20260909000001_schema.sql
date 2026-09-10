-- ============================================================================
-- Bakery Order & Administration System — 0001 SCHEMA
-- Enums, tables, indexes. Safe to re-run (idempotent guards where practical).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('ADMIN', 'SALES', 'PRODUCTION', 'CUSTOMER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_type as enum ('READY_STOCK', 'PRE_ORDER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum
    ('UNPAID', 'PAID', 'IN_PRODUCTION', 'READY', 'COMPLETED', 'CANCELLED');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- profiles  (1-1 with auth.users)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text not null default '',
  phone_number  text unique,
  role          public.user_role not null default 'CUSTOMER',
  address       text,
  created_at    timestamptz not null default now()
);

comment on table public.profiles is 'Application profile + role for each auth user.';

-- ----------------------------------------------------------------------------
-- categories
-- ----------------------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- products
-- ----------------------------------------------------------------------------
create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid references public.categories(id) on delete set null,
  name         text not null,
  description  text,
  price        integer not null check (price >= 0),          -- minor units / whole currency
  image_url    text,
  is_preorder  boolean not null default false,
  stock        integer not null default 0 check (stock >= 0),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists products_category_id_idx on public.products(category_id);
create index if not exists products_is_active_idx   on public.products(is_active);

-- ----------------------------------------------------------------------------
-- orders
-- ----------------------------------------------------------------------------
create table if not exists public.orders (
  id                      uuid primary key default gen_random_uuid(),
  order_number            text not null unique,
  customer_id             uuid not null references public.profiles(id) on delete restrict,
  created_by              uuid not null references public.profiles(id) on delete restrict,
  order_type              public.order_type not null default 'READY_STOCK',
  status                  public.order_status not null default 'UNPAID',
  pickup_or_delivery_date timestamptz,
  total_amount            integer not null default 0 check (total_amount >= 0),
  payment_method          text,
  payment_receipt_url     text,
  admin_notes             text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  -- a pre-order must carry a fulfilment date
  constraint orders_preorder_needs_date
    check (order_type <> 'PRE_ORDER' or pickup_or_delivery_date is not null)
);

create index if not exists orders_customer_id_idx on public.orders(customer_id);
create index if not exists orders_created_by_idx  on public.orders(created_by);
create index if not exists orders_status_idx      on public.orders(status);
create index if not exists orders_created_at_idx  on public.orders(created_at desc);

-- ----------------------------------------------------------------------------
-- order_items
-- ----------------------------------------------------------------------------
create table if not exists public.order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.orders(id) on delete cascade,
  product_id     uuid not null references public.products(id) on delete restrict,
  quantity       integer not null check (quantity > 0),
  price_at_time  integer not null check (price_at_time >= 0),
  subtotal       integer not null check (subtotal >= 0)
);

create index if not exists order_items_order_id_idx   on public.order_items(order_id);
create index if not exists order_items_product_id_idx on public.order_items(product_id);
