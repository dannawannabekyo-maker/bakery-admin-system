/** Floating "Contact Sales" WhatsApp button — hidden entirely if Admin hasn't set a number. */
export function SalesWhatsappButton({
  number,
  label,
}: {
  number: string | null;
  label: string | null;
}) {
  if (!number) return null;

  const digits = number.replace(/\D/g, "");
  const waNumber = digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
  const text = encodeURIComponent("Halo, saya butuh bantuan untuk pemesanan.");

  return (
    <a
      href={`https://wa.me/${waNumber}?text=${text}`}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-4 right-4 z-20 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105"
    >
      <span aria-hidden>💬</span>
      {label || "Hubungi Sales"}
    </a>
  );
}
