"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { removeClientRegistrationAction } from "@/app/actions/client";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { portalCopy } from "@/lib/copy/portal-copy";
import { Button } from "@/components/ui/button";

export function ClientRegistrationDeleteButton({
  invitationId,
}: {
  invitationId: string;
}) {
  const copy = portalCopy.clientInvitationsPage;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive touch-manipulation"
        disabled={isPending}
        aria-busy={isPending}
        onClick={() => setOpen(true)}
      >
        {copy.removeRegistration}
      </Button>

      <ConfirmDialog
        open={open}
        title={copy.removeRegistrationTitle}
        description={copy.removeRegistrationConfirm}
        confirmLabel={copy.removeRegistrationSubmit}
        cancelLabel={copy.removeRegistrationCancel}
        destructive
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          const formData = new FormData();
          formData.set("invitationId", invitationId);
          startTransition(async () => {
            const result = await removeClientRegistrationAction(formData);
            if (result?.error) {
              toast.error(result.error);
              return;
            }
            toast.success(copy.removeSuccess);
            router.refresh();
          });
        }}
      />
    </>
  );
}
