import type { ReactNode } from "react";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Read-only profile field — form-layout-01 grid row, studio-aligned. */
export function PortalProfileField({
  label,
  value,
  className,
  colSpan = 1,
  id,
}: {
  label: string;
  value: string | null | undefined;
  className?: string;
  colSpan?: 1 | 2;
  id?: string;
}) {
  if (!value) return null;

  const fieldId =
    id ?? `profile-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <Field
      className={cn(
        "gap-2",
        colSpan === 2 && "sm:col-span-2",
        className,
      )}
    >
      <FieldLabel htmlFor={fieldId}>{label}</FieldLabel>
      <Input
        id={fieldId}
        readOnly
        tabIndex={-1}
        aria-readonly="true"
        value={value}
        className="bg-muted/30 text-foreground read-only:cursor-default read-only:opacity-100"
      />
    </Field>
  );
}

export function PortalProfileFieldGroup({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <FieldGroup
      className={cn("grid grid-cols-1 gap-6 sm:grid-cols-2", className)}
    >
      {children}
    </FieldGroup>
  );
}
