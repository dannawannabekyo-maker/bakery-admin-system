"use client";

import { useFormStatus } from "react-dom";

import { Button, Alert } from "@/components/ui";
import type { ActionResult } from "@/lib/action-result";

export function SubmitButton({
  children,
  className,
  variant,
  size,
  pendingText,
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md";
  pendingText?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className={className}
      variant={variant}
      size={size}
    >
      {pending ? (pendingText ?? "Working…") : children}
    </Button>
  );
}

export function Feedback({ state }: { state: ActionResult | null }) {
  if (!state) return null;
  if (state.ok) {
    return state.message ? <Alert tone="success">{state.message}</Alert> : null;
  }
  return <Alert tone="error">{state.error}</Alert>;
}

/** Confirm-on-submit for destructive <form action={...}> buttons. */
export function ConfirmButton({
  children,
  message,
  className,
  variant = "danger",
  size = "sm",
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md";
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      className={className}
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </Button>
  );
}
