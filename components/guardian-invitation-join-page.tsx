"use client";

import { useRef, type ReactNode } from "react";
import {
  GuardianAuthFacade,
  type GuardianMode,
} from "@/components/auth";
import { useGuardianNeonAuthState } from "@/components/auth/use-guardian-neon-auth-state";
import { PortalInvitationJoinBrandPanel } from "@/components/portal/portal-invitation-join-brand-panel";
import { PortalInvitationJoinPanel } from "@/components/portal/portal-invitation-join-panel";
import { useThemeControls } from "@/components/theme-provider";
import type { JoinInvitationAuthView } from "@/lib/client-invitation-join-auth";
import {
  guardianModeFromPortalTheme,
  portalThemeFromGuardianMode,
  resolveGuardianJoinCopyOverride,
} from "@/lib/copy/guardian-editorial-copy";
import { GUARDIAN_AUTH_ASSET_SET } from "@/lib/copy/portal-brand";

export type GuardianInvitationJoinPageProps = {
  activeStep: number;
  authView: JoinInvitationAuthView;
  isAuthenticated: boolean;
  headerExtra?: ReactNode;
};

/**
 * Production join shell — Guardian presentation + invitation stepper panel.
 * @see ADR-Auth-UI-001 · SPEC-B Method B
 */
export function GuardianInvitationJoinPage({
  activeStep,
  authView,
  isAuthenticated,
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
        <PortalInvitationJoinPanel
          authView={authView}
          isAuthenticated={isAuthenticated}
        />
      </div>
    </GuardianAuthFacade>
  );
}
