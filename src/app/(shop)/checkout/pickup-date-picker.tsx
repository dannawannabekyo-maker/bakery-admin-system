"use client";

import { useMemo, useState } from "react";

import { cn } from "@/lib/cn";

export type PickupLoad = {
  /** YYYY-MM-DD, Jakarta calendar date */
  date: string;
  capacity: number;
  committed: number;
  remaining: number;
  full: boolean;
};

/**
 * Pre-order date picker for Option B capacity limits: greys out any date
 * where adding the current cart would exceed the nightly item ceiling.
 */
export function PickupDatePicker({
  loads,
  cartQty,
  name,
  minHoursAhead = 24,
}: {
  loads: PickupLoad[];
  cartQty: number;
  name: string;
  minHoursAhead?: number;
}) {
  const minInstant = Date.now() + minHoursAhead * 3600 * 1000;

  const options = useMemo(
    () =>
      loads.map((l) => {
        // Jakarta noon on that date — a simple, safe stand-in for "is this
        // day even reachable given the lead-time rule".
        const dayInstant = new Date(`${l.date}T12:00:00+07:00`).getTime();
        const tooSoon = dayInstant < minInstant;
        const fits = cartQty > 0 && cartQty <= l.remaining;
        return { ...l, tooSoon, disabled: tooSoon || !fits };
      }),
    [loads, cartQty, minInstant],
  );

  const [selectedDate, setSelectedDate] = useState(
    () => options.find((o) => !o.disabled)?.date ?? "",
  );
  const [time, setTime] = useState("10:00");

  const value = selectedDate ? `${selectedDate}T${time}:00+07:00` : "";

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={value} required />

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {options.map((o) => (
          <button
            key={o.date}
            type="button"
            disabled={o.disabled}
            aria-pressed={o.date === selectedDate}
            onClick={() => setSelectedDate(o.date)}
            className={cn(
              "rounded-lg border p-2 text-left text-xs transition-colors",
              o.date === selectedDate
                ? "border-primary bg-primary/10"
                : "border-border hover:bg-foreground/5",
              o.disabled && "cursor-not-allowed opacity-40 hover:bg-transparent",
            )}
          >
            <div className="font-medium">
              {new Intl.DateTimeFormat("id-ID", {
                weekday: "short",
                day: "numeric",
                month: "short",
                timeZone: "Asia/Jakarta",
              }).format(new Date(`${o.date}T12:00:00+07:00`))}
            </div>
            <div className="text-foreground/60">
              {o.tooSoon
                ? "< 24 jam"
                : o.remaining <= 0
                  ? "Penuh"
                  : `Sisa ${o.remaining} pcs`}
            </div>
          </button>
        ))}
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Jam pengambilan / pengiriman</span>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 sm:text-sm"
          required
        />
      </label>

      {!selectedDate && (
        <p className="text-sm text-red-600">
          Tidak ada tanggal tersedia untuk {cartQty} pcs dalam waktu dekat.
          Kurangi jumlah pesanan pre-order atau hubungi kami langsung.
        </p>
      )}
    </div>
  );
}
