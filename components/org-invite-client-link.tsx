"use client";

import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OrgInviteClientLink({ label }: { label: string }) {
  return (
    <Button
      size="sm"
      onClick={() => {
        document.getElementById("invite-client")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }}
    >
      <PlusIcon aria-hidden="true" />
      {label}
    </Button>
  );
}
