"use client";

import { useEffect } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const INVITE_SECTION_ID = "invite-client";
const INVITE_FIRST_FIELD_ID = "invite-full-name";

/** Scroll to the invite form and focus the first field (works even when already in view). */
export function scrollToInviteClientForm() {
  const section = document.getElementById(INVITE_SECTION_ID);
  if (!section) {
    return false;
  }

  section.scrollIntoView({ behavior: "smooth", block: "start" });

  window.setTimeout(() => {
    const firstField = document.getElementById(INVITE_FIRST_FIELD_ID);
    if (firstField instanceof HTMLElement) {
      firstField.focus({ preventScroll: true });
      return;
    }

    if (!section.hasAttribute("tabindex")) {
      section.setAttribute("tabindex", "-1");
    }
    section.focus({ preventScroll: true });
  }, 280);

  return true;
}

export function OrgInviteClientLink({ label }: { label: string }) {
  return (
    <Button
      size="sm"
      type="button"
      onClick={() => {
        scrollToInviteClientForm();
      }}
    >
      <PlusIcon aria-hidden="true" />
      {label}
    </Button>
  );
}

/** Scroll/focus invite form when landing with `#invite-client` (e.g. from declaration share panel). */
export function InviteClientHashHandler() {
  useEffect(() => {
    const syncFromHash = () => {
      if (window.location.hash === `#${INVITE_SECTION_ID}`) {
        scrollToInviteClientForm();
      }
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  return null;
}
