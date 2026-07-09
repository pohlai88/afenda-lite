"use client";

import { useRef, type ReactNode } from "react";
import {
  GuardianAuthFacade,
  type GuardianMode,
} from "@/components/auth";
import { PortalAuthFormIntro } from "@/components/portal/portal-auth-form-intro";
import { useGuardianNeonAuthState } from "@/components/auth/use-guardian-neon-auth-state";
import { PortalAuthNeonView } from "@/components/portal/portal-auth-neon-view";
import { useThemeControls } from "@/components/theme-provider";
import type { AuthShellCopy } from "@/lib/copy/auth-shell-copy";
import {
  guardianModeFromPortalTheme,
  portalThemeFromGuardianMode,
  resolveGuardianAuthCopyOverride,
} from "@/lib/copy/guardian-editorial-copy";
import { GUARDIAN_AUTH_ASSET_SET } from "@/lib/copy/portal-brand";

export type GuardianAuthLoginPageProps = {
  pathname: string;
  from?: string;
  redirectTo?: string;
  shellCopy: AuthShellCopy;
  headerExtra?: ReactNode;
  /** Pre-rendered intro from server — kept for Storybook parity when omitted. */
  formIntro?: ReactNode;
};

/**
 * Production cinematic auth shell — Guardian presentation + Neon AuthView in access slot.
 * PortalAuthFormIntro supplies path/org-specific headings; Neon AuthView owns credential fields.
 * @see ADR-Auth-UI-001 · SPEC-B Method B
 */
export function GuardianAuthLoginPage({
  pathname,
  from,
  redirectTo,
  shellCopy,
  headerExtra,
  formIntro,
}: GuardianAuthLoginPageProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme, setTheme } = useThemeControls();
  const mode: GuardianMode = guardianModeFromPortalTheme(resolvedTheme);
  const state = useGuardianNeonAuthState(panelRef);
  const copyOverride = resolveGuardianAuthCopyOverride({ path: pathname, from });

  return (
    <GuardianAuthFacade
      mode={mode}
      state={state}
      onModeChange={(next) => setTheme(portalThemeFromGuardianMode(next))}
      assets={GUARDIAN_AUTH_ASSET_SET}
      copy={copyOverride}
    >
      <div
        ref={panelRef}
        className="guardian-auth__access-panel flex w-full flex-col gap-4"
      >
        {headerExtra}
        {formIntro ?? <PortalAuthFormIntro {...shellCopy} />}
        <PortalAuthNeonView pathname={pathname} redirectTo={redirectTo} />
      </div>
    </GuardianAuthFacade>
  );
}
