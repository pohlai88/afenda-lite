"use client";

import { useState, useTransition } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { acceptClientInviteAction } from "@/app/actions/client";
import { portalCopy } from "@/lib/portal-copy";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
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
      <div className="space-y-2">
        <Label htmlFor="invite-password">{clientInvite.passwordLabel}</Label>
        <InputGroup>
          <InputGroupInput
            id="invite-password"
            name="password"
            type={isVisible ? "text" : "password"}
            required
            minLength={8}
            autoComplete="new-password"
          />
          <InputGroupAddon align="inline-end" className="pr-1.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsVisible((value) => !value)}
            >
              {isVisible ? <EyeOffIcon /> : <EyeIcon />}
            </Button>
          </InputGroupAddon>
        </InputGroup>
      </div>
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
      {error ? (
        <Alert variant="destructive" role="alert" aria-live="polite">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? clientInvite.submitting : clientInvite.submit}
      </Button>
    </form>
  );
}
