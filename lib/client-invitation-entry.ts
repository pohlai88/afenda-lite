import "server-only";

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PORTAL_NAME, portalCopy } from "@/lib/portal-copy";
import {
  AUTH_SIGN_IN_HREF,
  buildClientJoinHref,
} from "@/lib/portal-routes";
import { getAuthenticatedLandingHref } from "@/lib/portal-session-routing";

export const clientInvitationJoinMetadata: Metadata = {
  title: `${PORTAL_NAME} — ${portalCopy.metadata.clientInvitationJoin.title}`,
  description: portalCopy.metadata.clientInvitationJoin.description,
  robots: { index: false, follow: false },
};

export function resolveClientInvitationJoinShell() {
  const { clientInvitationJoin, product, trust } = portalCopy;

  return {
    eyebrow: product.portalEyebrow,
    heroTitle: clientInvitationJoin.heroTitle,
    heroDescription: clientInvitationJoin.heroDescription,
    signInTitle: clientInvitationJoin.panelCreateTitle,
    signInDescription: clientInvitationJoin.panelCreateDescription,
    trustNotice: clientInvitationJoin.trustNotice,
    alternateLink: {
      href: AUTH_SIGN_IN_HREF,
      label: clientInvitationJoin.alternateSignInLabel,
    },
    signInHeadingId: "client-invitation-heading",
  };
}

/** Canonical invitation entry — `/join?invitationId=…` */
export async function runClientInvitationJoinPage({
  searchParams,
}: {
  searchParams: Promise<{ invitationId?: string }>;
}) {
  const landing = await getAuthenticatedLandingHref();
  const { invitationId: invitationIdRaw } = await searchParams;
  const invitationId = invitationIdRaw?.trim();

  if (landing && !invitationId) {
    redirect(landing);
  }

  return { invitationId: invitationId ?? null };
}

export function redirectAuthAcceptInvitationToJoin(invitationId: string): never {
  redirect(buildClientJoinHref(invitationId));
}

export async function redirectInvitationIdToJoin({
  searchParams,
}: {
  searchParams: Promise<{ invitationId?: string }>;
}): Promise<void> {
  const { invitationId } = await searchParams;
  const trimmed = invitationId?.trim();
  if (trimmed) {
    redirectAuthAcceptInvitationToJoin(trimmed);
  }
}
