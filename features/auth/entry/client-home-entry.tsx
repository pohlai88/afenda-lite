import "server-only";

import { redirect } from "next/navigation";
import { LynxLandingPage } from "@/features/landing";
import { redirectInvitationIdToJoin } from "@/features/auth/entry/client-invitation-entry";
import {
  clientSignInAuthHref,
  clientSignUpAuthHref,
} from "@/modules/platform/routing/portal-routes";
import { resolvePlaygroundEmbedActive } from "@/modules/platform/playground-embed";
import { getAuthenticatedLandingHref } from "@/modules/platform/routing/portal-session-routing";

export type ClientHomeSearchParams = {
  reason?: string;
  invitationId?: string;
  embed?: string;
};

/**
 * Guest landing entry with invitation and authenticated-session dispatch.
 * Playground embeds intentionally keep the guest surface visible.
 */
export async function runClientHomeEntryPage({
  searchParams,
}: {
  searchParams: Promise<ClientHomeSearchParams>;
}) {
  await redirectInvitationIdToJoin({ searchParams });

  const params = await searchParams;
  const embed = await resolvePlaygroundEmbedActive(params);
  const landing = await getAuthenticatedLandingHref({ embed });
  if (landing) {
    redirect(landing);
  }

  return (
    <LynxLandingPage
      signInHref={clientSignInAuthHref(params.reason)}
      signUpHref={clientSignUpAuthHref(params.reason)}
    />
  );
}
