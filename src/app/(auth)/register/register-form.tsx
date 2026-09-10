"use client";

import { useActionState } from "react";

import { signUp, type AuthState } from "../actions";
import { Button, Field, Input, Alert } from "@/components/ui";

const initial: AuthState = { error: null };

export function RegisterForm() {
  const [state, action, pending] = useActionState(signUp, initial);

  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}

      <Field label="Full name">
        <Input name="full_name" required autoComplete="name" />
      </Field>
      <Field label="Phone number" hint="Optional, but useful for pickup contact.">
        <Input name="phone_number" type="tel" autoComplete="tel" />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" required autoComplete="email" />
      </Field>
      <Field label="Password" hint="At least 8 characters.">
        <Input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </Field>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating…" : "Create account"}
      </Button>
    </form>
  );
}
