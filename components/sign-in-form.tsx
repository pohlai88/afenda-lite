"use client";

import { useId, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { FormErrorAlert } from "@/components/form-error-alert";
import { PasswordField } from "@/components/password-field";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SignInCopy = {
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  submit: string;
  submitting: string;
};

export function SignInForm({
  action,
  copy,
  ariaLabelledBy,
  footer,
}: {
  action: (formData: FormData) => Promise<{ error?: string } | void>;
  copy: SignInCopy;
  ariaLabelledBy?: string;
  footer?: ReactNode;
}) {
  const formId = useId();
  const emailId = `${formId}-email`;
  const passwordId = `${formId}-password`;
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      aria-labelledby={ariaLabelledBy}
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);

        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await action(formData);
          if (result?.error) {
            setError(result.error);
          }
        });
      }}
    >
      <FieldGroup className="gap-4">
        <Field>
          <Label htmlFor={emailId}>{copy.emailLabel}</Label>
          <Input
            id={emailId}
            name="email"
            type="email"
            required
            autoComplete="username"
            spellCheck={false}
            placeholder={copy.emailPlaceholder}
          />
        </Field>

        <PasswordField
          id={passwordId}
          label={copy.passwordLabel}
        />

        <FormErrorAlert error={error} />

        <Field>
          <Button
            className="w-full touch-manipulation"
            type="submit"
            disabled={isPending}
            aria-busy={isPending}
          >
            {isPending ? copy.submitting : copy.submit}
          </Button>
        </Field>
      </FieldGroup>

      {footer ? (
        <div className="text-center text-sm text-muted-foreground">{footer}</div>
      ) : null}
    </form>
  );
}
