"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import {
  addCapital,
  addExpense,
  deleteCapital,
  deleteExpense,
} from "../actions";
import { Card, Field, Input, Select, Textarea } from "@/components/ui";
import { SubmitButton, Feedback, ConfirmButton } from "@/components/form";
import { asFormAction } from "@/lib/action-result";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABEL } from "@/lib/constants";

/* --------------------------------------------- starting capital (modal) */

export function AddCapitalModal({ today }: { today: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(addCapital, null);

  useEffect(() => {
    if (open) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [open]);

  useEffect(() => {
    if (state?.ok) {
      const t = setTimeout(() => setOpen(false), 700);
      return () => clearTimeout(t);
    }
  }, [state]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        + Input modal awal
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        className="w-[min(28rem,92vw)] rounded-xl border border-border bg-background p-0 text-foreground backdrop:bg-black/40"
      >
        <form action={action} className="space-y-4 p-5">
          <div>
            <h2 className="text-lg font-bold">Modal awal / suntikan kas</h2>
            <p className="text-sm text-foreground/60">
              Catat setoran modal. Nilai ini menambah kas yang tersedia pada
              perhitungan cash flow.
            </p>
          </div>

          <Feedback state={state} />

          <Field label="Nominal (Rp)">
            <Input
              name="amount"
              inputMode="numeric"
              autoComplete="off"
              placeholder="5.000.000"
              required
            />
          </Field>
          <Field label="Tanggal">
            <Input type="date" name="entry_date" defaultValue={today} />
          </Field>
          <Field label="Catatan (opsional)">
            <Textarea name="note" placeholder="Setoran modal awal dari pemilik" />
          </Field>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium"
            >
              Batal
            </button>
            <SubmitButton pendingText="Menyimpan…">Simpan</SubmitButton>
          </div>
        </form>
      </dialog>
    </>
  );
}

/* --------------------------------------------------- operational expense */

export function AddExpenseForm({ today }: { today: string }) {
  const [state, action] = useActionState(addExpense, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <Card>
      <form
        ref={formRef}
        action={action}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="sm:col-span-2 lg:col-span-4">
          <Feedback state={state} />
        </div>
        <Field label="Nominal (Rp)">
          <Input
            name="amount"
            inputMode="numeric"
            autoComplete="off"
            placeholder="250.000"
            required
          />
        </Field>
        <Field label="Kategori">
          <Select name="category" defaultValue="OPERATIONAL">
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {EXPENSE_CATEGORY_LABEL[c] ?? c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Tanggal">
          <Input type="date" name="spent_at" defaultValue={today} />
        </Field>
        <Field label="Catatan (opsional)">
          <Input name="note" placeholder="Beli tepung 25kg" />
        </Field>
        <div className="sm:col-span-2 lg:col-span-4">
          <SubmitButton pendingText="Menyimpan…">Catat pengeluaran</SubmitButton>
        </div>
      </form>
    </Card>
  );
}

/* ---------------------------------------------------------- delete button */

export function DeleteCapitalButton({ id }: { id: string }) {
  return (
    <form action={asFormAction(deleteCapital)}>
      <input type="hidden" name="id" value={id} />
      <ConfirmButton message="Hapus entri modal ini?" size="sm" variant="outline">
        Hapus
      </ConfirmButton>
    </form>
  );
}

export function DeleteExpenseButton({ id }: { id: string }) {
  return (
    <form action={asFormAction(deleteExpense)}>
      <input type="hidden" name="id" value={id} />
      <ConfirmButton message="Hapus pengeluaran ini?" size="sm" variant="outline">
        Hapus
      </ConfirmButton>
    </form>
  );
}
