"use client";

import { useFormStatus } from "react-dom";
import { Loader2Icon, SettingsIcon } from "lucide-react";
import { createDraftSurveyAction } from "@/app/actions/surveys";
import { Button } from "@/components-V2/platform-components/ui/button";
import { portalCopy } from "@/lib/copy/portal-copy";

function CreateDraftSubmitButton() {
  const { create } = portalCopy.org;
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
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

export function PortalCreateDeclarationButton() {
  const { create } = portalCopy.org;

  return (
    <form action={createDraftSurveyAction} className="space-y-3">
      <p className="text-muted-foreground text-pretty text-xs">{create.hint}</p>
      <CreateDraftSubmitButton />
    </form>
  );
}
