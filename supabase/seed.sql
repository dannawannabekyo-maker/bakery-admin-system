-- ============================================================================
-- Bakery Order & Administration System — SEED (sample catalogue)
-- Idempotent: keyed on slug / name. Replace image_url values once real assets
-- are uploaded to the `product-images` bucket.
-- ============================================================================

insert into public.categories (name, slug) values
  ('Breads',       'breads'),
  ('Cakes',        'cakes'),
  ('Pastries',     'pastries'),
  ('Cookies',      'cookies'),
  ('Custom Cakes', 'custom-cakes')
on conflict (slug) do nothing;

-- READY_STOCK items ---------------------------------------------------------
insert into public.products (category_id, name, description, price, is_preorder, stock, is_active)
select c.id, v.name, v.description, v.price, false, v.stock, true
from (values
  ('breads',   'Sourdough Loaf',        'Naturally leavened, 24h ferment, crackling crust.',    65000,  20),
  ('breads',   'Wholewheat Sandwich',   'Soft everyday loaf, pre-sliced.',                      45000,  30),
  ('breads',   'Cheese Garlic Bread',   'Buttery pull-apart with mozzarella.',                  55000,  15),
  ('pastries', 'Butter Croissant',      'Laminated 27 layers, pure butter.',                   28000,  40),
  ('pastries', 'Pain au Chocolat',      'Two batons of dark chocolate.',                        32000,  35),
  ('pastries', 'Cinnamon Roll',         'Cream-cheese glaze, still warm.',                      35000,  24),
  ('cookies',  'Chocolate Chunk Cookie','Brown-butter dough, sea salt.',                        18000,  60),
  ('cookies',  'Double Choc Cookie',    'Cocoa dough with white & dark chunks.',                20000,  50),
  ('cakes',    'Classic Carrot Slice',  'Walnut, spice, cream-cheese frosting.',                42000,  18),
  ('cakes',    'New York Cheesecake',   'Dense, vanilla, graham base — per slice.',             48000,  16)
) as v(cat_slug, name, description, price, stock)
join public.categories c on c.slug = v.cat_slug
where not exists (select 1 from public.products p where p.name = v.name);

-- PRE_ORDER items ---------------------------------------------------------
insert into public.products (category_id, name, description, price, is_preorder, stock, is_active)
select c.id, v.name, v.description, v.price, true, 0, true
from (values
  ('custom-cakes', 'Custom Birthday Cake 8"',  'Choose sponge & filling at checkout. 2 days notice.',  450000),
  ('custom-cakes', 'Custom Number Cake',       'Any digit, fresh cream & berries. 3 days notice.',     380000),
  ('cakes',        'Whole Tiramisu (PO)',      'Family size, made to order. 2 days notice.',           400000),
  ('breads',       'Festive Stollen (PO)',     'Marzipan core, dried fruit. Seasonal pre-order.',      220000)
) as v(cat_slug, name, description, price)
join public.categories c on c.slug = v.cat_slug
where not exists (select 1 from public.products p where p.name = v.name);
