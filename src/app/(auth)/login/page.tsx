import Link from "next/link";

import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; registered?: string }>;
}) {
  const { next, registered } = await searchParams;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="text-sm text-foreground/60">
          Access your orders, the kitchen board, or the admin console.
        </p>
      </div>

      {registered && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-200">
          Account created. Please sign in.
        </p>
      )}

      <LoginForm next={next ?? ""} />

      <p className="text-center text-sm text-foreground/60">
        New customer?{" "}
        <Link href="/register" className="font-medium text-primary underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
