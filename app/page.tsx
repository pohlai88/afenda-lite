import { redirect } from "next/navigation";

import { LynxLandingPage } from "@/features/landing";
import { redirectInvitationIdToJoin } from "@/lib/entry/client-invitation-entry";
import {
  clientLoginPageMetadata,
  clientSignInAuthHref,
} from "@/lib/entry/client-sign-in-entry";
import { getAuthenticatedLandingHref } from "@/lib/routing/portal-session-routing";

export const metadata = clientLoginPageMetadata;
export const dynamic = "force-dynamic";

/**
 * Guest landing (Lynx Morphor) + session skip for authenticated users.
 * Named client entry `/client/login` still redirects straight to Neon sign-in.
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; invitationId?: string }>;
}) {
  await redirectInvitationIdToJoin({ searchParams });

  const landing = await getAuthenticatedLandingHref();
  if (landing) {
    redirect(landing);
  }

  const params = await searchParams;
  return <LynxLandingPage signInHref={clientSignInAuthHref(params.reason)} />;
}
