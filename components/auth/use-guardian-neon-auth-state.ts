"use client";

import { useEffect, useState, type RefObject } from "react";
import type { GuardianState } from "./types";
import { authClient } from "@/lib/auth/client";
import {
  collectNeonAccessPanelSignals,
  inferGuardianStateFromNeonSignals,
} from "@/lib/auth/guardian-neon-state";

/**
 * Mirrors Neon AuthView activity into Guardian cinematic state classes.
 * DOM-scoped to the access panel — no duplicate credential UI.
 */
export function useGuardianNeonAuthState(
  panelRef: RefObject<HTMLElement | null>,
): GuardianState {
  const { isPending: sessionPending } = authClient.useSession();
  const [state, setState] = useState<GuardianState>("loading");

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const sync = () => {
      const next = inferGuardianStateFromNeonSignals(
        collectNeonAccessPanelSignals(panel, { sessionPending }),
      );
      setState((current) => (current === next ? current : next));
    };

    sync();

    const panelObserver = new MutationObserver(sync);
    panelObserver.observe(panel, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["disabled", "aria-busy", "aria-invalid", "class", "data-type"],
    });

    const toastObserver = new MutationObserver(sync);
    toastObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-type", "class"],
    });

    panel.addEventListener("focusin", sync);
    panel.addEventListener("focusout", sync);
    panel.addEventListener("input", sync);

    return () => {
      panelObserver.disconnect();
      toastObserver.disconnect();
      panel.removeEventListener("focusin", sync);
      panel.removeEventListener("focusout", sync);
      panel.removeEventListener("input", sync);
    };
  }, [panelRef, sessionPending]);

  return state;
}
