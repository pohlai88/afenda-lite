"use client";

import { useState, useTransition } from "react";
import { RefreshCwIcon } from "lucide-react";
import { regenerateInviteTokenAction } from "@/app/actions/surveys";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { portalCopy } from "@/lib/portal-copy";

export function SecureLinkRotateButton({ surveyId }: { surveyId: string }) {
  const { share } = portalCopy;
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
            await regenerateInviteTokenAction(formData);
          });
        }}
      />
    </>
  );
}
