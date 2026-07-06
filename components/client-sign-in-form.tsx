"use client";

import { useId, useState, useTransition } from "react";
import Link from "next/link";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { clientSignInAction } from "@/app/actions/client";
import { portalCopy } from "@/lib/portal-copy";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";

export function ClientSignInForm() {
  const { clientAuth } = portalCopy;
  const formId = useId();
  const emailId = `${formId}-email`;
  const passwordId = `${formId}-password`;
  const [isVisible, setIsVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await clientSignInAction(formData);
          if (result?.error) setError(result.error);
        });
      }}
    >
      <FieldGroup className="gap-4">
        <Field>
          <Label htmlFor={emailId}>{portalCopy.signIn.emailLabel}</Label>
          <Input
            id={emailId}
            name="email"
            type="email"
            required
            autoComplete="username"
            placeholder={portalCopy.signIn.emailPlaceholder}
          />
        </Field>
        <Field>
          <Label htmlFor={passwordId}>{portalCopy.signIn.passwordLabel}</Label>
          <InputGroup>
            <InputGroupInput
              id={passwordId}
              name="password"
              type={isVisible ? "text" : "password"}
              required
              autoComplete="current-password"
            />
            <InputGroupAddon align="inline-end" className="pr-1.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground rounded-l-none hover:bg-transparent"
                aria-label={isVisible ? "Hide password" : "Show password"}
                onClick={() => setIsVisible((value) => !value)}
              >
                {isVisible ? <EyeOffIcon /> : <EyeIcon />}
              </Button>
            </InputGroupAddon>
          </InputGroup>
        </Field>
        {error ? (
          <Alert variant="destructive" role="alert" aria-live="polite">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? clientAuth.submitting : clientAuth.submit}
        </Button>
      </FieldGroup>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/" className="font-medium text-primary hover:underline">
          {clientAuth.operatorLink}
        </Link>
      </p>
    </form>
  );
}
