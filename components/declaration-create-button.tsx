"use client";

import { useTransition } from "react";
import { createDraftSurveyAction } from "@/app/actions/surveys";
import { portalCopy } from "@/lib/portal-copy";
import { Button } from "@/components/ui/button";
import { Loader2Icon, SettingsIcon } from "lucide-react";

export function DeclarationCreateButton() {
  const { create } = portalCopy.org;
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground text-pretty">
        {create.hint}
      </p>
      <Button
        type="button"
        className="w-full touch-manipulation"
        disabled={isPending}
        aria-busy={isPending}
        onClick={() => {
          startTransition(async () => {
            await createDraftSurveyAction();
          });
        }}
      >
        {isPending ? (
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
    </div>
  );
}
