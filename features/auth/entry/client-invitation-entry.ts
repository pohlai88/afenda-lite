import "server-only";

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PORTAL_NAME, portalCopy } from "@/modules/platform/copy/portal-copy";
import {
  buildClientJoinHref,
} from "@/modules/platform/routing/portal-routes";
import { getAuthenticatedLandingHref } from "@/modules/platform/routing/portal-session-routing";

export const clientInvitationJoinMetadata: Metadata = {
  title: `${PORTAL_NAME} — ${portalCopy.metadata.clientInvitationJoin.title}`,
  description: portalCopy.metadata.clientInvitationJoin.description,
  robots: { index: false, follow: false },
};

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
