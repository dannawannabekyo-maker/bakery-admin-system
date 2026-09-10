export type ActionResult =
  | { ok: true; message?: string; redirectTo?: string }
  | { ok: false; error: string };

export const ok = (message?: string, redirectTo?: string): ActionResult => ({
  ok: true,
  message,
  redirectTo,
});
export const fail = (error: string): ActionResult => ({ ok: false, error });

export const emptyResult: ActionResult | null = null;

/**
 * Re-type a result-returning server action for direct use as a `<form action>`
 * where the return value is not consumed (React ignores it). This is an
 * identity cast — the same action reference is returned, so the server-action
 * boundary is preserved.
 */
export const asFormAction = (
  fn: (formData: FormData) => Promise<ActionResult>,
): ((formData: FormData) => void | Promise<void>) =>
  fn as unknown as (formData: FormData) => void | Promise<void>;

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
