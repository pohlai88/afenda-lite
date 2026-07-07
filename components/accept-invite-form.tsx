"use client";

import { useState, useTransition } from "react";
import { acceptClientInviteAction } from "@/app/actions/client";
import { FormErrorAlert } from "@/components/form-error-alert";
import { portalCopy } from "@/lib/portal-copy";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { EyeIcon, EyeOffIcon } from "lucide-react";

/** register-01 pattern — password fields with visibility toggles. */
export function AcceptInviteForm({
  token,
  fullName,
  email,
}: {
  token: string;
  fullName: string;
  email: string;
}) {
  const { clientInvite } = portalCopy;
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        const formData = new FormData(event.currentTarget);
        formData.set("token", token);
        startTransition(async () => {
          const result = await acceptClientInviteAction(formData);
          if (result?.error) setError(result.error);
        });
      }}
    >
      <div className="rounded-md border border-dashed p-4 text-center">
        <p className="font-medium">{fullName}</p>
        <p className="text-sm text-muted-foreground">{email}</p>
      </div>

      <FieldGroup className="gap-4">
        <Field className="gap-2">
          <FieldLabel htmlFor="invite-password">{clientInvite.passwordLabel}</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="invite-password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="••••••••"
            />
            <InputGroupAddon align="inline-end" className="pr-1.5">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowPassword((value) => !value)}
                className="text-muted-foreground hover:bg-transparent"
              >
                {showPassword ? (
                  <EyeOffIcon aria-hidden="true" />
                ) : (
                  <EyeIcon aria-hidden="true" />
                )}
                <span className="sr-only">
                  {showPassword ? "Hide password" : "Show password"}
                </span>
              </Button>
            </InputGroupAddon>
          </InputGroup>
        </Field>

        <Field className="gap-2">
          <FieldLabel htmlFor="invite-confirm">
            {clientInvite.confirmPasswordLabel}
          </FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="invite-confirm"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="••••••••"
            />
            <InputGroupAddon align="inline-end" className="pr-1.5">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowConfirmPassword((value) => !value)}
                className="text-muted-foreground hover:bg-transparent"
              >
                {showConfirmPassword ? (
                  <EyeOffIcon aria-hidden="true" />
                ) : (
                  <EyeIcon aria-hidden="true" />
                )}
                <span className="sr-only">
                  {showConfirmPassword ? "Hide password" : "Show password"}
                </span>
              </Button>
            </InputGroupAddon>
          </InputGroup>
        </Field>
      </FieldGroup>

      <FormErrorAlert error={error} />
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? clientInvite.submitting : clientInvite.submit}
      </Button>
    </form>
  );
}
