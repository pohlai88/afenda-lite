"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { copyText } from "@/lib/clipboard";
import { portalCopy } from "@/lib/copy/portal-copy";
import { Button } from "@/components-V2/platform-components/ui/button";

export function CopyAccessMessage({
  message,
  label,
}: {
  message: string;
  label?: string;
}) {
  const { clientAccess } = portalCopy;
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-2 rounded-md border border-dashed p-4">
      <p className="text-sm font-medium">{label ?? clientAccess.copyLabel}</p>
      <p className="portal-code-block whitespace-pre-wrap break-words">{message}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            await copyText(message);
            toast.success(clientAccess.copied);
          });
        }}
      >
        {clientAccess.copyButton}
      </Button>
    </div>
  );
}
