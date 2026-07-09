import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { authViewPaths } from "@neondatabase/auth-ui/server";
import { GuardianAuthLoginPage } from "@/components/guardian-auth-login-page";
import { PortalAuthFormIntro } from "@/components/portal-auth-form-intro";
import { PortalAuthLayout } from "@/components/portal-auth-layout";
import { PortalAuthNeonView } from "@/components/portal-auth-neon-view";
import {
  AUTH_ENTRY_PATHS,
  AuthPageNotices,
} from "@/lib/auth/auth-page-notices";
import { resolveShowVaultHeading } from "@/lib/auth/auth-form-intro-visibility";
import { isGuardianAuthShellEnabled } from "@/lib/auth/guardian-auth-shell";
import { resolveAuthShellCopy } from "@/lib/auth-shell-copy";
import { portalAuthMetadata } from "@/lib/auth-metadata";
import { redirectAuthAcceptInvitationToJoin } from "@/lib/client-invitation-entry";
import { resolvePlaygroundEmbedActive } from "@/lib/playground";
import { sanitizeReturnToPath } from "@/lib/portal-routes";
import { getAuthenticatedLandingHref } from "@/lib/portal-session-routing";

export const dynamic = "force-dynamic";
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.values(authViewPaths).map((path) => ({ path }));
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ path: string }>;
  searchParams: Promise<{ from?: string }>;
}): Promise<Metadata> {
  const [{ path }, { from }] = await Promise.all([params, searchParams]);
  return portalAuthMetadata(path, { from });
}

export default async function AuthPage({
  params,
  searchParams,
}: {
  params: Promise<{ path: string }>;
  searchParams: Promise<{
    from?: string;
    reason?: string;
    returnTo?: string;
    invitationId?: string;
    embed?: string;
  }>;
}) {
  const [{ path }, query] = await Promise.all([params, searchParams]);
  const { from, reason, returnTo: returnToRaw, invitationId } = query;
  const embed = await resolvePlaygroundEmbedActive(query);
  const returnTo = sanitizeReturnToPath(returnToRaw);

  if (path === "accept-invitation" && invitationId?.trim()) {
    redirectAuthAcceptInvitationToJoin(invitationId.trim());
  }

  if (AUTH_ENTRY_PATHS.has(path) && !embed) {
    const landing = await getAuthenticatedLandingHref();
    if (landing) {
      redirect(returnTo ?? landing);
    }
  }

  const shellCopy = resolveAuthShellCopy({ path, from });
  const redirectTo = returnTo ?? undefined;
  const useGuardianShell = isGuardianAuthShellEnabled() && !embed;
  const headerExtra = (
    <AuthPageNotices path={path} from={from} reason={reason} />
  );
  const formIntro = (
    <PortalAuthFormIntro
      {...shellCopy}
      showVaultHeading={resolveShowVaultHeading({ path, from })}
    />
  );

  if (useGuardianShell) {
    return (
      <GuardianAuthLoginPage
        pathname={path}
        from={from}
        redirectTo={redirectTo}
        shellCopy={shellCopy}
        headerExtra={headerExtra}
        formIntro={formIntro}
      />
    );
  }

  return (
    <PortalAuthLayout headerExtra={headerExtra}>
      <div className="flex w-full flex-col gap-4">
        {formIntro}
        <PortalAuthNeonView pathname={path} redirectTo={redirectTo} />
      </div>
    </PortalAuthLayout>
  );
}
