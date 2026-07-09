"use client";

import { useState } from "react";
import {
  GuardianAuthFacade,
  type GuardianMode,
  type GuardianState,
} from "@/components/auth";
import { GUARDIAN_AUTH_ASSET_SET } from "@/lib/portal-brand";

/**
 * Cinematic sign-in shell — composes reusable Guardian Auth components.
 * Neon Auth wiring lands in AccessVaultCard / card-zone children in a follow-up.
 */
export function GuardianAuthLoginPage() {
  const [mode, setMode] = useState<GuardianMode>("night");
  const [state, setState] = useState<GuardianState>("idle");

  return (
    <GuardianAuthFacade
      mode={mode}
      state={state}
      onModeChange={setMode}
      assets={GUARDIAN_AUTH_ASSET_SET}
    />
  );
}
