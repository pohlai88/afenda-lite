"use client";

import { useState, useTransition } from "react";
import { saveClientOnboardingAction } from "@/app/actions/client";
import { portalCopy } from "@/lib/portal-copy";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ClientOnboardingForm({
  defaults,
}: {
  defaults?: {
    phone?: string | null;
    entityName?: string | null;
    jurisdiction?: string | null;
    notes?: string | null;
  };
}) {
  const { clientOnboarding } = portalCopy;
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await saveClientOnboardingAction(
            new FormData(event.currentTarget),
          );
          if (result?.error) setError(result.error);
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="phone">{clientOnboarding.phoneLabel}</Label>
        <Input
          id="phone"
          name="phone"
          required
          defaultValue={defaults?.phone ?? ""}
          placeholder={clientOnboarding.phonePlaceholder}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="entityName">{clientOnboarding.entityLabel}</Label>
        <Input
          id="entityName"
          name="entityName"
          required
          defaultValue={defaults?.entityName ?? ""}
          placeholder={clientOnboarding.entityPlaceholder}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="jurisdiction">{clientOnboarding.jurisdictionLabel}</Label>
        <Input
          id="jurisdiction"
          name="jurisdiction"
          required
          defaultValue={defaults?.jurisdiction ?? ""}
          placeholder={clientOnboarding.jurisdictionPlaceholder}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">{clientOnboarding.notesLabel}</Label>
        <Textarea
          id="notes"
          name="notes"
          className="min-h-24"
          defaultValue={defaults?.notes ?? ""}
          placeholder={clientOnboarding.notesPlaceholder}
        />
      </div>
      {error ? (
        <Alert variant="destructive" role="alert" aria-live="polite">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? clientOnboarding.submitting : clientOnboarding.submit}
      </Button>
    </form>
  );
}
