"use client";

import { useActionState } from "react";

import { createUser, updateUser } from "../actions";
import { Field, Input, Select } from "@/components/ui";
import { SubmitButton, Feedback } from "@/components/form";
import { ROLES } from "@/lib/constants";
import type { ProfileRow } from "@/lib/supabase/database.types";

export function CreateUserForm() {
  const [state, action] = useActionState(createUser, null);

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <Feedback state={state} />
      <Field label="Full name">
        <Input name="full_name" required />
      </Field>
      <Field label="Role">
        <Select name="role" defaultValue="SALES">
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Email">
        <Input name="email" type="email" required />
      </Field>
      <Field label="Phone">
        <Input name="phone_number" type="tel" />
      </Field>
      <Field label="Temporary password" hint="Min 8 chars. Share securely.">
        <Input name="password" type="text" minLength={8} required />
      </Field>
      <Field label="Address">
        <Input name="address" />
      </Field>
      <div className="sm:col-span-2">
        <SubmitButton pendingText="Creating…">Create user</SubmitButton>
      </div>
    </form>
  );
}

export function EditUserForm({ profile }: { profile: ProfileRow }) {
  const [state, action] = useActionState(updateUser, null);

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="id" value={profile.id} />
      <Feedback state={state} />
      <Field label="Full name">
        <Input name="full_name" defaultValue={profile.full_name} />
      </Field>
      <Field label="Role">
        <Select name="role" defaultValue={profile.role}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Phone">
        <Input name="phone_number" defaultValue={profile.phone_number ?? ""} />
      </Field>
      <Field label="Address">
        <Input name="address" defaultValue={profile.address ?? ""} />
      </Field>
      <Field label="Reset password" hint="Leave blank to keep current">
        <Input name="password" type="text" />
      </Field>
      <div className="sm:col-span-2">
        <SubmitButton pendingText="Saving…" size="sm">
          Save changes
        </SubmitButton>
      </div>
    </form>
  );
}
