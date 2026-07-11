"use client";

import { useState } from "react";
import { Checkbox } from "@/components-V2/platform-components/ui/checkbox";
import { cn } from "@/components-V2/lib/utils";

/**
 * P2-AC-05 — Declarations AdminCN form DNA.
 * Native controls keep FormData `name` (Base UI Input can omit names);
 * classes mirror `components-V2/.../ui/input` + operator select pattern.
 */
export const FFT_NATIVE_FIELD_CLASS =
  "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 h-9 w-full min-w-0 rounded-md border bg-transparent px-2.5 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

export const FFT_NATIVE_SELECT_CLASS = cn(
  FFT_NATIVE_FIELD_CLASS,
  "appearance-auto",
);

export const FFT_NATIVE_TEXTAREA_CLASS =
  "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-2.5 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

/** AdminCN Checkbox + hidden input so progressive form posts still work. */
export function TradeFormCheckbox({
  name,
  defaultChecked = false,
  checked: checkedProp,
  onCheckedChange,
  disabled,
  id,
  value = "on",
  "data-testid": testId,
}: {
  name?: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  /** Hidden input value when checked (forms). Default `on`. */
  value?: string;
  "data-testid"?: string;
}) {
  const [uncontrolled, setUncontrolled] = useState(defaultChecked);
  const isControlled = checkedProp !== undefined;
  const checked = isControlled ? checkedProp : uncontrolled;

  function setChecked(next: boolean) {
    if (!isControlled) setUncontrolled(next);
    onCheckedChange?.(next);
  }

  return (
    <>
      {name && checked && !disabled ? (
        <input type="hidden" name={name} value={value} />
      ) : null}
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(v) => setChecked(v === true)}
        data-testid={testId}
      />
    </>
  );
}
