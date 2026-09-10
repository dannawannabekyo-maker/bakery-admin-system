"use client";

import { useActionState } from "react";

import { saveCategory } from "../actions";
import { Field, Input } from "@/components/ui";
import { SubmitButton, Feedback } from "@/components/form";
import type { CategoryRow } from "@/lib/supabase/database.types";

export function CategoryForm({ category }: { category?: CategoryRow }) {
  const [state, action] = useActionState(saveCategory, null);

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      {category && <input type="hidden" name="id" value={category.id} />}
      <div className="min-w-40 flex-1">
        <Field label="Name">
          <Input name="name" defaultValue={category?.name} required />
        </Field>
      </div>
      <div className="min-w-40 flex-1">
        <Field label="Slug" hint="Leave blank to auto-generate">
          <Input name="slug" defaultValue={category?.slug} />
        </Field>
      </div>
      <SubmitButton pendingText="Saving…">
        {category ? "Save" : "Add category"}
      </SubmitButton>
      <div className="w-full">
        <Feedback state={state} />
      </div>
    </form>
  );
}
