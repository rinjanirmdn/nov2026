"use client";

import { useFormStatus } from "react-dom";

function Submit({ className, children }: { className?: string; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {children}
    </button>
  );
}

/** Tombol hapus dengan konfirmasi. `action` biasanya server action yang sudah di-bind dengan id. */
export function ConfirmButton({
  action,
  confirmText,
  className = "small danger",
  label,
  children,
}: {
  action: () => Promise<void>;
  confirmText: string;
  className?: string;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
      aria-label={label}
      style={{ display: "contents" }}
    >
      <Submit className={className}>{children}</Submit>
    </form>
  );
}
