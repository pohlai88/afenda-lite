"use client";

import { useId, useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { portalCopy } from "@/lib/portal-copy";

export function PasswordField({
  id,
  name = "password",
  label,
  autoComplete = "current-password",
  minLength,
}: {
  id?: string;
  name?: string;
  label: string;
  autoComplete?: string;
  minLength?: number;
}) {
  const fallbackId = useId();
  const fieldId = id ?? fallbackId;
  const [isVisible, setIsVisible] = useState(false);
  const { signIn } = portalCopy;

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId}>{label}</Label>
      <InputGroup>
        <InputGroupInput
          id={fieldId}
          name={name}
          type={isVisible ? "text" : "password"}
          required
          minLength={minLength}
          autoComplete={autoComplete}
          spellCheck={false}
          className="min-h-11 touch-manipulation"
          placeholder="••••••••••••••••"
        />
        <InputGroupAddon align="inline-end" className="pr-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 text-muted-foreground rounded-l-none hover:bg-transparent touch-manipulation"
            aria-label={isVisible ? signIn.hidePassword : signIn.showPassword}
            onClick={() => setIsVisible((value) => !value)}
          >
            {isVisible ? (
              <EyeOffIcon aria-hidden="true" />
            ) : (
              <EyeIcon aria-hidden="true" />
            )}
          </Button>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}
