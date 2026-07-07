import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authViewPaths } from "@neondatabase/auth/react/ui/server";
import { PortalAccessDeniedNotice } from "@/components/portal-access-denied-notice";
import { PortalAuthReasonNotice } from "@/components/portal-auth-reason-notice";
import { PortalAuthLayout } from "@/components/portal-auth-layout";
import { PortalNeonAuthView } from "@/components/portal-neon-view";
import { resolveAuthShellCopy } from "@/lib/auth-shell-copy";
import { portalAuthMetadata } from "@/lib/auth-metadata";
import { resolveClientAuthReasonNotice } from "@/lib/client-sign-in-entry";
import {
  isOrgAccessDeniedReason,
  isOrgSignInFrom,
} from "@/lib/org-sign-in-entry";
import { isPlaygroundEmbedRequest } from "@/lib/playground";
import { AUTH_FORGOT_PASSWORD_HREF, sanitizeReturnToPath } from "@/lib/portal-routes";
import { getAuthenticatedLandingHref } from "@/lib/portal-session-routing";

export const dynamic = "force-dynamic";
export const dynamicParams = false;

const AUTH_ENTRY_PATHS = new Set(["sign-in", "sign-up", "forgot-password"]);

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
  searchParams: Promise<{ from?: string; reason?: string; returnTo?: string }>;
}) {
  const [{ path }, { from, reason, returnTo: returnToRaw }] = await Promise.all([
    params,
    searchParams,
  ]);
  const embed = await isPlaygroundEmbedRequest();
  const fromOrg = isOrgSignInFrom(from);
  const returnTo = sanitizeReturnToPath(returnToRaw);

  if (AUTH_ENTRY_PATHS.has(path) && !embed) {
    const landing = await getAuthenticatedLandingHref();
    if (landing) {
      redirect(returnTo ?? landing);
    }
  }

  const shell = resolveAuthShellCopy({ path, from });
  const showAccessDenied =
    fromOrg && path === "sign-in" && isOrgAccessDeniedReason(reason);
  const reasonNotice =
    !fromOrg && path === "sign-in"
      ? resolveClientAuthReasonNotice(reason)
      : null;

  const headerExtra = showAccessDenied ? (
    <PortalAccessDeniedNotice />
  ) : reasonNotice ? (
    <PortalAuthReasonNotice message={reasonNotice} />
  ) : undefined;

  return (
    <PortalAuthLayout
      eyebrow={shell.eyebrow}
      heroTitle={shell.heroTitle}
      heroDescription={shell.heroDescription}
      signInTitle={shell.signInTitle}
      signInDescription={shell.signInDescription}
      trustNotice={shell.trustNotice}
      alternateLink={shell.alternateLink}
      signInHeadingId={shell.signInHeadingId}
      headerExtra={headerExtra}
      form={
        <div className="portal-neon-view v-stack gap-3">
          <PortalNeonAuthView pathname={path} />
          {path === "sign-in" ? (
            <p className="text-center text-sm">
              <Link href={AUTH_FORGOT_PASSWORD_HREF} className="portal-auth-alt-link">
                Forgot password?
              </Link>
            </p>
          ) : null}
        </div>
      }
      footerHint={shell.footerHint}
    />
  );
}
