"use client";

import { useState } from "react";
import { formatAmountInput } from "@/lib/format";
import type { Member } from "@/lib/data";

export function AmountInput({ label, name = "amount", defaultValue }: { label: string; name?: string; defaultValue?: number | null }) {
  const [value, setValue] = useState(formatAmountInput(defaultValue ?? ""));
  return (
    <label>
      {label}
      <input
        name={name}
        inputMode="numeric"
        autoComplete="off"
        placeholder="0"
        value={value}
        onChange={(e) => setValue(formatAmountInput(e.target.value))}
      />
    </label>
  );
}

export function MemberSelect({ label, members, defaultValue }: { label: string; members: Member[]; defaultValue?: string | null }) {
  return (
    <label>
      {label}
      <select name="userId" defaultValue={defaultValue ?? members[0]?.id}>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function DateInput({ defaultValue, label = "Tanggal" }: { defaultValue: string; label?: string }) {
  return (
    <label>
      {label}
      <input type="date" name="date" defaultValue={defaultValue} required />
    </label>
  );
}
