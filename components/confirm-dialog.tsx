"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  destructive = false,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      setMounted(true);
      if (!dialog.open) dialog.showModal();
      return;
    }

    if (dialog.open) dialog.close();
  }, [open]);

  if (!mounted && !open) return null;

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-border bg-background p-6 shadow-lg backdrop:bg-black/50"
      onClose={onCancel}
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button
          type="button"
          variant={destructive ? "destructive" : "default"}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
