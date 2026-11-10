"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ActionResult, FormAction } from "@/lib/form";
import { ActionForm } from "./action-form";

interface Props {
  trigger: ReactNode;
  triggerClass?: string;
  triggerLabel?: string;
  title: string;
  action: FormAction;
  submitLabel?: string;
  children: ReactNode;
}

/** Tombol yang membuka dialog berisi form. Form hanya dirender saat dialog terbuka,
 *  jadi setiap kali dibuka isinya mulai dari awal. */
export function FormDialog({ trigger, triggerClass, triggerLabel, title, action, submitLabel = "Simpan", children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && ref.current && !ref.current.open) ref.current.showModal();
  }, [open]);

  return (
    <>
      <button type="button" className={triggerClass} aria-label={triggerLabel} onClick={() => setOpen(true)}>
        {trigger}
      </button>
      <dialog ref={ref} onClose={() => setOpen(false)} aria-label={title}>
        {open && (
          <DialogForm title={title} action={action} submitLabel={submitLabel} onDone={() => ref.current?.close()}>
            {children}
          </DialogForm>
        )}
      </dialog>
    </>
  );
}

function DialogForm({
  title,
  action,
  submitLabel,
  onDone,
  children,
}: {
  title: string;
  action: FormAction;
  submitLabel: string;
  onDone: () => void;
  children: ReactNode;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, {});
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  useEffect(() => {
    if (!state.ok) return;
    onDone();
    if (state.month && state.month !== params.get("bulan")) {
      const next = new URLSearchParams(params);
      next.set("bulan", state.month);
      router.push(`${pathname}?${next}`);
    }
    // onDone/params sengaja tidak masuk dependensi: hanya bereaksi pada hasil baru.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  return (
    <ActionForm action={formAction}>
      <h2>{title}</h2>
      {children}
      {state.error && (
        <p className="error" role="alert">
          {state.error}
        </p>
      )}
      <div className="form-actions">
        <button type="button" className="ghost" onClick={onDone}>
          Batal
        </button>
        <button type="submit" className="primary" disabled={pending}>
          {pending ? "Menyimpan…" : submitLabel}
        </button>
      </div>
    </ActionForm>
  );
}
