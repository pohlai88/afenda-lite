"use client";

import { useState, useTransition } from "react";
import { acceptClientInviteAction } from "@/app/actions/client";
import { FormErrorAlert } from "@/components/form-error-alert";
import { PasswordField } from "@/components/password-field";
import { portalCopy } from "@/lib/portal-copy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      <div className="portal-info-block">
        <p className="font-medium">{fullName}</p>
        <p className="text-muted-foreground">{email}</p>
      </div>
      <PasswordField
        id="invite-password"
        name="password"
        label={clientInvite.passwordLabel}
        autoComplete="new-password"
        minLength={8}
      />
      <div className="space-y-2">
        <Label htmlFor="invite-confirm">{clientInvite.confirmPasswordLabel}</Label>
        <Input
          id="invite-confirm"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      <FormErrorAlert error={error} />
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? clientInvite.submitting : clientInvite.submit}
      </Button>
    </form>
  );
}
