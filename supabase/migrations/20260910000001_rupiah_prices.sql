-- ============================================================================
-- Allins Bakery — 0005  Convert catalogue + order money to whole rupiah (IDR)
--
-- The original seed used small USD-scale integers (2–45). The app now formats
-- every amount as IDR, so existing rows are rescaled to realistic rupiah.
--
-- Idempotent: every statement is guarded by `... < 1000`, so once a row has
-- been converted it is skipped on any re-run (db-push replays all migrations).
-- ============================================================================

-- Catalogue: set known seed products to sensible rupiah prices.
update public.products p
set price = v.new_price
from (values
  ('Sourdough Loaf',          65000),
  ('Wholewheat Sandwich',     45000),
  ('Cheese Garlic Bread',     55000),
  ('Butter Croissant',        28000),
  ('Pain au Chocolat',        32000),
  ('Cinnamon Roll',           35000),
  ('Chocolate Chunk Cookie',  18000),
  ('Double Choc Cookie',      20000),
  ('Classic Carrot Slice',    42000),
  ('New York Cheesecake',     48000),
  ('Custom Birthday Cake 8"', 450000),
  ('Custom Number Cake',      380000),
  ('Whole Tiramisu (PO)',     400000),
  ('Festive Stollen (PO)',    220000)
) as v(name, new_price)
where p.name = v.name
  and p.price < 1000;

-- Any other products still on the old scale: flat ×1000 fallback.
update public.products
set price = price * 1000
where price > 0 and price < 1000;

-- Existing orders / line items: keep them consistent with the new scale.
update public.order_items
set price_at_time = price_at_time * 1000,
    subtotal      = subtotal * 1000
where subtotal > 0 and subtotal < 1000;

update public.orders
set total_amount = total_amount * 1000
where total_amount > 0 and total_amount < 1000;
