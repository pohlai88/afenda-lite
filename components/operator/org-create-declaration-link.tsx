"use client";

import { useTransition } from "react";
import { createDraftSurveyAction } from "@/app/actions/surveys";
import { PlusIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OrgCreateDeclarationLink({ label }: { label: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      disabled={isPending}
      aria-busy={isPending}
      onClick={() => {
        startTransition(async () => {
          await createDraftSurveyAction();
        });
      }}
    >
      {isPending ? (
        <Loader2Icon aria-hidden="true" className="animate-spin" />
      ) : (
        <PlusIcon aria-hidden="true" />
      )}
      {label}
    </Button>
  );
}
