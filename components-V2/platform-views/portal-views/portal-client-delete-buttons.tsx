"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  deleteClientAssignmentAction,
  removeClientRegistrationAction,
} from "@/app/actions/client";
import { ConfirmDialog } from "@/features/operator/confirm-dialog";
import { Button } from "@/components-V2/platform-components/ui/button";
import { portalCopy } from "@/lib/copy/portal-copy";

export function PortalRegistrationDeleteButton({
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
        className="text-destructive hover:text-destructive"
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

export function PortalAssignmentDeleteButton({
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
        className="text-destructive hover:text-destructive"
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
