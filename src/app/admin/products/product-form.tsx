"use client";

import { useActionState } from "react";

import { saveProduct } from "../actions";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { SubmitButton, Feedback } from "@/components/form";
import type { CategoryRow, ProductRow } from "@/lib/supabase/database.types";

export function ProductForm({
  product,
  categories,
  onDone,
}: {
  product?: ProductRow;
  categories: CategoryRow[];
  onDone?: () => void;
}) {
  const [state, action] = useActionState(saveProduct, null);
  if (state?.ok && onDone) onDone();

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      {product && <input type="hidden" name="id" value={product.id} />}
      <Feedback state={state} />

      <div className="sm:col-span-2">
        <Field label="Name">
          <Input name="name" defaultValue={product?.name} required />
        </Field>
      </div>

      <Field label="Price (whole currency)">
        <Input
          name="price"
          type="number"
          min={0}
          step={1}
          defaultValue={product?.price ?? 0}
          required
        />
      </Field>

      <Field label="Category">
        <Select name="category_id" defaultValue={product?.category_id ?? ""}>
          <option value="">— none —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Stock (ready-stock only)">
        <Input
          name="stock"
          type="number"
          min={0}
          step={1}
          defaultValue={product?.stock ?? 0}
        />
      </Field>

      <Field label="Image URL" hint="Public URL or product-images bucket path">
        <Input name="image_url" defaultValue={product?.image_url ?? ""} />
      </Field>

      <div className="sm:col-span-2">
        <Field label="Description">
          <Textarea name="description" defaultValue={product?.description ?? ""} />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_preorder"
          defaultChecked={product?.is_preorder ?? false}
        />
        Pre-order item (requires a pickup/delivery date at checkout)
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={product ? product.is_active : true}
        />
        Active (visible in the shop)
      </label>

      <div className="sm:col-span-2">
        <SubmitButton pendingText="Saving…">
          {product ? "Save changes" : "Create product"}
        </SubmitButton>
      </div>
    </form>
  );
}
