"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { RefreshCwIcon } from "lucide-react";
import { regenerateInviteTokenAction } from "@/app/actions/surveys";
import { ConfirmDialog } from "@/features/organization-admin/confirm-dialog";
import { Button } from "@/components-V2/platform-components/ui/button";
import { portalCopy } from "@/modules/platform/copy/portal-copy";

export function SecureLinkRotateButton({ surveyId }: { surveyId: string }) {
  const { share } = portalCopy;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="touch-manipulation"
        disabled={isPending}
        aria-busy={isPending}
        onClick={() => setOpen(true)}
      >
        <RefreshCwIcon aria-hidden="true" />
        {share.rotateSecureLinkCta}
      </Button>

      <ConfirmDialog
        open={open}
        title={share.rotateSecureLinkTitle}
        description={share.rotateSecureLinkConfirm}
        confirmLabel={share.rotateSecureLinkSubmit}
        cancelLabel={share.rotateSecureLinkCancel}
        destructive
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          const formData = new FormData();
          formData.set("surveyId", surveyId);
          startTransition(async () => {
            const result = await regenerateInviteTokenAction(formData);
            if (result && "success" in result && result.success) {
              router.refresh();
            }
          });
        }}
      />
    </>
  );
}
