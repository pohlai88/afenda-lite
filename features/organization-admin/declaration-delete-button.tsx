"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2Icon } from "lucide-react";
import { deleteSurveyAction } from "@/app/actions/surveys";
import { ConfirmDialog } from "@/features/organization-admin/confirm-dialog";
import { portalCopy } from "@/modules/platform/copy/portal-copy";
import { ORGANIZATION_ADMIN_DASHBOARD_HREF } from "@/modules/platform/routing/portal-routes";
import { Button } from "@/components-V2/platform-components/ui/button";

export function DeclarationDeleteButton({ surveyId }: { surveyId: string }) {
  const { manage } = portalCopy.declarationDetail;
  const router = useRouter();
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
        <Trash2Icon aria-hidden="true" />
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
            const result = await deleteSurveyAction(formData);
            if (result && "success" in result && result.success) {
              router.push(ORGANIZATION_ADMIN_DASHBOARD_HREF);
            }
          });
        }}
      />
    </>
  );
}
