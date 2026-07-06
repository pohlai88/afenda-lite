"use client";

import { useId, useState, useTransition } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { adminSignInAction } from "@/app/actions/admin";
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

export function PortalSignInForm() {
  const { signIn } = portalCopy;
  const formId = useId();
  const emailId = `${formId}-email`;
  const passwordId = `${formId}-password`;
  const errorId = `${formId}-error`;

  const [isVisible, setIsVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      aria-labelledby="sign-in-heading"
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);

        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await adminSignInAction(formData);
          if (result?.error) {
            setError(result.error);
          }
        });
      }}
    >
      <FieldGroup className="gap-4">
        <Field>
          <Label htmlFor={emailId}>{signIn.emailLabel}</Label>
          <Input
            id={emailId}
            name="email"
            type="email"
            required
            autoComplete="username"
            spellCheck={false}
            placeholder={signIn.emailPlaceholder}
          />
        </Field>

        <Field>
          <Label htmlFor={passwordId}>{signIn.passwordLabel}</Label>
          <InputGroup>
            <InputGroupInput
              id={passwordId}
              name="password"
              type={isVisible ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="••••••••••••••••"
            />
            <InputGroupAddon align="inline-end" className="pr-1.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground rounded-l-none hover:bg-transparent touch-manipulation"
                aria-label={isVisible ? "Hide password" : "Show password"}
                onClick={() => setIsVisible((value) => !value)}
              >
                {isVisible ? <EyeOffIcon /> : <EyeIcon />}
              </Button>
            </InputGroupAddon>
          </InputGroup>
        </Field>

        {error ? (
          <Alert
            variant="destructive"
            id={errorId}
            role="alert"
            aria-live="polite"
          >
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <Field>
          <Button
            className="w-full touch-manipulation"
            type="submit"
            disabled={isPending}
            aria-busy={isPending}
          >
            {isPending ? signIn.submitting : signIn.submit}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
