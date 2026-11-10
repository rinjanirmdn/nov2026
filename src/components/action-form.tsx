"use client";

import { startTransition, type ComponentProps } from "react";

/**
 * <form> untuk server action yang TIDAK mengosongkan isian ketika action mengembalikan error.
 * (React 19 otomatis me-reset form setelah `action={...}` selesai, termasuk saat gagal validasi,
 * sehingga pengguna harus mengetik ulang semuanya.) Reset setelah sukses diatur pemanggil lewat `key`.
 */
export function ActionForm({
  action,
  ...props
}: Omit<ComponentProps<"form">, "action" | "onSubmit"> & { action: (fd: FormData) => void }) {
  return (
    <form
      {...props}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
    />
  );
}
