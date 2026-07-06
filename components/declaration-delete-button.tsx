"use client";

import { useTransition } from "react";
import { Trash2Icon } from "lucide-react";
import { deleteSurveyAction } from "@/app/actions/surveys";
import { portalCopy } from "@/lib/portal-copy";
import { Button } from "@/components/ui/button";

export function DeclarationDeleteButton({ surveyId }: { surveyId: string }) {
  const { manage } = portalCopy.declarationDetail;
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      className="touch-manipulation"
      disabled={isPending}
      aria-busy={isPending}
      onClick={() => {
        if (!window.confirm(manage.deleteConfirm)) {
          return;
        }

        const formData = new FormData();
        formData.set("id", surveyId);
        startTransition(async () => {
          await deleteSurveyAction(formData);
        });
      }}
    >
      <Trash2Icon />
      {manage.deleteSubmit}
    </Button>
  );
}
