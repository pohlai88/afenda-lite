"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteSurveyAction } from "@/app/actions/surveys";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { portalCopy } from "@/lib/copy/portal-copy";

export function DeclarationRowDeleteAction({ surveyId }: { surveyId: string }) {
  const { manage } = portalCopy.declarationDetail;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <DropdownMenuItem
        variant="destructive"
        disabled={isPending}
        onClick={() => setOpen(true)}
      >
        {manage.deleteSubmit}
      </DropdownMenuItem>

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
            router.refresh();
          });
        }}
      />
    </>
  );
}
