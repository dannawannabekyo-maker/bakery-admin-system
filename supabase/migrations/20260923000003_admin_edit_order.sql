-- Admin "edit nota" after payment: change item quantities / prices, drop item
-- lines, and replace the order's add-ons — all in ONE transaction so stock,
-- lines and total can never drift apart.
--
-- Stock: READY_STOCK stock is deducted when an order becomes PAID, so for any
-- order that is PAID / IN_PRODUCTION / READY / COMPLETED the quantity change
-- (new - old) is applied to products.stock here (negative delta restocks).
-- Raises when stock is insufficient. Nightly PO capacity is NOT re-checked:
-- this is an ADMIN override, like the manual-order capacity bypass.
--
-- p_items  : [{ "id": <order_items.id>, "quantity": int (0 = remove line), "price": int }]
--            Lines not listed are left untouched.
-- p_addons : full replacement list, same shape as order_addons columns
--            [{ kind, name, description, contents, quantity, unit_price, show_on_receipt }]
create or replace function public.admin_edit_order_lines(
  p_order_id uuid,
  p_items    jsonb,
  p_addons   jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  o          public.orders%rowtype;
  it         jsonb;
  addon      jsonb;
  line       public.order_items%rowtype;
  prod       public.products%rowtype;
  new_qty    integer;
  new_price  integer;
  delta      integer;
  deducted   boolean;
  remaining  integer;
  new_total  integer;
begin
  if not public.is_privileged() then
    raise exception 'Only ADMIN may edit an order nota';
  end if;

  select * into o from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;
  if o.status = 'CANCELLED' then
    raise exception 'A cancelled order cannot be edited';
  end if;

  -- stock was already deducted once the order reached PAID
  deducted := o.status in ('PAID', 'IN_PRODUCTION', 'READY', 'COMPLETED');

  for it in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    select * into line
      from public.order_items
     where id = (it->>'id')::uuid and order_id = p_order_id
     for update;
    if not found then
      raise exception 'Item line % does not belong to this order', it->>'id';
    end if;

    new_qty   := greatest(coalesce((it->>'quantity')::integer, line.quantity), 0);
    new_price := greatest(coalesce((it->>'price')::integer, line.price_at_time), 0);
    delta     := new_qty - line.quantity;

    if deducted and delta <> 0 then
      select * into prod from public.products where id = line.product_id for update;
      if found and prod.is_preorder = false then
        if delta > 0 and prod.stock < delta then
          raise exception 'Not enough stock for "%" (only % left, need % more)',
            prod.name, prod.stock, delta;
        end if;
        update public.products set stock = stock - delta where id = prod.id;
      end if;
    end if;

    if new_qty = 0 then
      delete from public.order_items where id = line.id;
    else
      update public.order_items
         set quantity      = new_qty,
             price_at_time = new_price,
             subtotal      = new_qty * new_price
       where id = line.id;
    end if;
  end loop;

  -- add-ons: full replacement (billing-only, never touches stock)
  delete from public.order_addons where order_id = p_order_id;
  for addon in select * from jsonb_array_elements(coalesce(p_addons, '[]'::jsonb))
  loop
    insert into public.order_addons
      (order_id, kind, name, description, contents, quantity, unit_price, subtotal, show_on_receipt)
    values (
      p_order_id,
      coalesce(addon->>'kind', 'LAINNYA'),
      addon->>'name',
      nullif(addon->>'description', ''),
      coalesce(addon->'contents', '[]'::jsonb),
      greatest(coalesce((addon->>'quantity')::integer, 1), 1),
      greatest(coalesce((addon->>'unit_price')::integer, 0), 0),
      greatest(coalesce((addon->>'quantity')::integer, 1), 1)
        * greatest(coalesce((addon->>'unit_price')::integer, 0), 0),
      coalesce((addon->>'show_on_receipt')::boolean, true)
    );
  end loop;

  select (select count(*) from public.order_items  where order_id = p_order_id)
       + (select count(*) from public.order_addons where order_id = p_order_id)
    into remaining;
  if remaining = 0 then
    raise exception 'An order must keep at least one item or add-on (cancel it instead)';
  end if;

  new_total := public.recalc_order_total(p_order_id);
  return new_total;
end;
$$;

-- service-role (admin server action) only — never callable from the browser
revoke all on function public.admin_edit_order_lines(uuid, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.admin_edit_order_lines(uuid, jsonb, jsonb) to service_role;
