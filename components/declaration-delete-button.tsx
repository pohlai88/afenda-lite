"use client";

import { useState, useTransition } from "react";
import { Trash2Icon } from "lucide-react";
import { deleteSurveyAction } from "@/app/actions/surveys";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { portalCopy } from "@/lib/portal-copy";
import { Button } from "@/components/ui/button";

export function DeclarationDeleteButton({ surveyId }: { surveyId: string }) {
  const { manage } = portalCopy.declarationDetail;
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        className="touch-manipulation"
        disabled={isPending}
        aria-busy={isPending}
        onClick={() => setOpen(true)}
      >
        <Trash2Icon />
        {manage.deleteSubmit}
      </Button>

      <ConfirmDialog
        open={open}
        title={manage.deleteTitle}
        description={manage.deleteConfirm}
        confirmLabel={manage.deleteSubmit}
        cancelLabel={manage.deleteCancel}
        destructive
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          const formData = new FormData();
          formData.set("id", surveyId);
          startTransition(async () => {
            await deleteSurveyAction(formData);
          });
        }}
      />
    </>
  );
}
