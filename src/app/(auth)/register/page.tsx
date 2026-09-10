import Link from "next/link";

import { RegisterForm } from "./register-form";

export const metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="text-sm text-foreground/60">
          For customers. Staff accounts are created by the owner.
        </p>
      </div>

      <RegisterForm />

      <p className="text-center text-sm text-foreground/60">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
