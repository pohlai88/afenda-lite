"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteClientAssignmentAction } from "@/app/actions/client";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { portalCopy } from "@/lib/copy/portal-copy";
import { Button } from "@/components/ui/button";

export function ClientAssignmentDeleteButton({
  assignmentId,
}: {
  assignmentId: string;
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
        {copy.removeAssignment}
      </Button>

      <ConfirmDialog
        open={open}
        title={copy.removeAssignmentTitle}
        description={copy.removeAssignmentConfirm}
        confirmLabel={copy.removeAssignmentSubmit}
        cancelLabel={copy.removeAssignmentCancel}
        destructive
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          const formData = new FormData();
          formData.set("assignmentId", assignmentId);
          startTransition(async () => {
            const result = await deleteClientAssignmentAction(formData);
            if (result?.error) {
              toast.error(result.error);
              return;
            }
            router.refresh();
          });
        }}
      />
    </>
  );
}
