import { Alert } from "@/components/ui";

/** Shown on every shop page while Admin has the store marked closed. */
export function StoreClosedBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-4">
      <Alert tone="error">
        <span aria-hidden>🚫</span> {message}
      </Alert>
    </div>
  );
}
