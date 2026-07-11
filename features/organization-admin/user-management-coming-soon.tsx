"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components-V2/platform-components/ui/dialog";
import { Button } from "@/components-V2/platform-components/ui/button";

interface UserManagementComingSoonProps {
  feature: string | null;
  onClose: () => void;
}

export function UserManagementComingSoon({
  feature,
  onClose,
}: UserManagementComingSoonProps) {
  return (
    <Dialog open={feature !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Coming soon</DialogTitle>
          <DialogDescription>
            {feature ?? "This capability"} is not wired yet. Live user list,
            role, and suspend/activate are available; create/edit forms, import,
            export, and bulk delete remain deferred.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onClose}>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ComingSoonPanel({ title }: { title: string }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 text-center">
      <p className="text-base font-semibold">{title}</p>
      <p className="text-muted-foreground max-w-md text-sm">
        Coming soon. Create/edit forms stay deferred; the list and detail
        pages already load live Neon Auth users.
      </p>
    </div>
  );
}
