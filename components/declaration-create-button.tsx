"use client";

import { useFormStatus } from "react-dom";
import { createDraftSurveyAction } from "@/app/actions/surveys";
import { portalCopy } from "@/lib/copy/portal-copy";
import { Button } from "@/components/ui/button";
import { Loader2Icon, SettingsIcon } from "lucide-react";

function CreateDraftSubmitButton() {
  const { create } = portalCopy.org;
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className="w-full touch-manipulation"
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? (
        <>
          <Loader2Icon aria-hidden="true" className="animate-spin" />
          {create.submitting}
        </>
      ) : (
        <>
          <SettingsIcon aria-hidden="true" />
          {create.openSettings}
        </>
      )}
    </Button>
  );
}

export function DeclarationCreateButton() {
  const { create } = portalCopy.org;

  return (
    <form action={createDraftSurveyAction} className="space-y-3">
      <p className="text-xs text-muted-foreground text-pretty">{create.hint}</p>
      <CreateDraftSubmitButton />
    </form>
  );
}
