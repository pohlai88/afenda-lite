import type { ReactNode } from "react";
import { StudioAuthShell } from "@/features/auth/studio-auth-shell";
import { PortalAuthFormIntro } from "@/features/auth/portal-auth-form-intro";
import { PortalAuthNeonView } from "@/features/auth/portal-auth-neon-view";
import type { AuthShellCopy } from "@/features/auth/auth-shell-copy";

/** Production auth page — Studio login-page-02 chrome + Neon AuthView. */
export function StudioAuthLoginPage({
  pathname,
  redirectTo,
  shellCopy,
  headerExtra,
  formIntro,
  showVaultHeading = true,
}: {
  pathname: string;
  redirectTo?: string;
  shellCopy: AuthShellCopy;
  headerExtra?: ReactNode;
  formIntro?: ReactNode;
  showVaultHeading?: boolean;
}) {
  return (
    <StudioAuthShell>
      <div className="flex flex-col gap-6">
        {headerExtra}
        {formIntro ?? (
          <PortalAuthFormIntro
            {...shellCopy}
            showVaultHeading={showVaultHeading}
          />
        )}
        <PortalAuthNeonView pathname={pathname} redirectTo={redirectTo} />
      </div>
    </StudioAuthShell>
  );
}
