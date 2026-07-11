import { redirect } from "next/navigation";

import { LynxLandingPage } from "@/features/landing";
import { redirectInvitationIdToJoin } from "@/lib/entry/client-invitation-entry";
import {
  clientLoginPageMetadata,
  clientSignInAuthHref,
  clientSignUpAuthHref,
} from "@/lib/entry/client-sign-in-entry";
import { resolvePlaygroundEmbedActive } from "@/modules/platform/playground-embed";
import { getAuthenticatedLandingHref } from "@/modules/platform/routing/portal-session-routing";

export const metadata = clientLoginPageMetadata;
export const dynamic = "force-dynamic";

/**
 * Guest landing (Lynx laptop hero) + session skip for authenticated users.
 * Named client entry `/client/login` still redirects straight to Neon sign-in.
 * Playground `?embed=1` must keep the landing visible (operator session is expected).
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{
    reason?: string;
    invitationId?: string;
    embed?: string;
  }>;
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
