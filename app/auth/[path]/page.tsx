import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { authViewPaths } from "@neondatabase/auth-ui/server";
import {
  AuthPageNotices,
  AUTH_ENTRY_PATHS,
  PortalAuthFormIntro,
  StudioAuthLoginPage,
} from "@/features/auth";
import { resolveShowVaultHeading } from "@/lib/auth/auth-form-intro-visibility";
import { resolveAuthShellCopy } from "@/lib/copy/auth-shell-copy";
import { portalAuthMetadata } from "@/modules/identity/auth-metadata";
import { redirectAuthAcceptInvitationToJoin } from "@/lib/entry/client-invitation-entry";
import { resolvePlaygroundEmbedActive } from "@/modules/platform/playground-embed";
import { resolveNeonAuthViewRedirectTo } from "@/modules/identity/auth/neon-auth-view-redirect";
import { sanitizeReturnToPath } from "@/modules/platform/routing/portal-routes";
import { getAuthenticatedLandingHref } from "@/modules/platform/routing/portal-session-routing";

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
  const showVaultHeading = resolveShowVaultHeading({ path, from });
  const redirectTo = resolveNeonAuthViewRedirectTo({ from, returnTo });
  const headerExtra = (
    <AuthPageNotices path={path} from={from} reason={reason} />
  );
  const formIntro = (
    <PortalAuthFormIntro
      {...shellCopy}
      showVaultHeading={showVaultHeading}
    />
  );

  return (
    <StudioAuthLoginPage
      pathname={path}
      redirectTo={redirectTo}
      shellCopy={shellCopy}
      headerExtra={headerExtra}
      formIntro={formIntro}
    />
  );
}
