"use client";

import { useRef, type ReactNode } from "react";
import {
  GuardianAuthFacade,
  type GuardianMode,
} from "@/components/auth";
import { useGuardianNeonAuthState } from "@/components/auth/use-guardian-neon-auth-state";
import { PortalInvitationJoinBrandPanel } from "@/components/portal-invitation-join-brand-panel";
import { PortalInvitationJoinPanel } from "@/components/portal-invitation-join-panel";
import { useThemeControls } from "@/components/theme-provider";
import {
  guardianModeFromPortalTheme,
  portalThemeFromGuardianMode,
  resolveGuardianJoinCopyOverride,
} from "@/lib/guardian-editorial-copy";
import { GUARDIAN_AUTH_ASSET_SET } from "@/lib/portal-brand";

export type GuardianInvitationJoinPageProps = {
  activeStep: number;
  headerExtra?: ReactNode;
};

/**
 * Production join shell — Guardian presentation + invitation stepper panel.
 * @see ADR-Auth-UI-001 · SPEC-B Method B
 */
export function GuardianInvitationJoinPage({
  activeStep,
  headerExtra,
}: GuardianInvitationJoinPageProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme, setTheme } = useThemeControls();
  const mode: GuardianMode = guardianModeFromPortalTheme(resolvedTheme);
  const state = useGuardianNeonAuthState(panelRef);

  return (
    <GuardianAuthFacade
      mode={mode}
      state={state}
      onModeChange={(next) => setTheme(portalThemeFromGuardianMode(next))}
      assets={GUARDIAN_AUTH_ASSET_SET}
      copy={resolveGuardianJoinCopyOverride()}
      leftPanel={<PortalInvitationJoinBrandPanel activeStep={activeStep} />}
    >
      <div
        ref={panelRef}
        className="guardian-auth__access-panel flex w-full flex-col gap-4"
      >
        {headerExtra}
        <PortalInvitationJoinPanel />
      </div>
    </GuardianAuthFacade>
  );
}
