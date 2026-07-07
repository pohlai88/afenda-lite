import "server-only";

import { isAdminSession } from "@/lib/admin";
import { getAuthSession } from "@/lib/auth/get-session";
import { bootstrapClientAfterAuth } from "@/lib/auth/bootstrap-client-invite";
import { getClientProfile } from "@/lib/clients";
import {
  clientPostAuthHref,
  OPERATOR_DASHBOARD_HREF,
} from "@/lib/portal-routes";

export async function resolveClientLandingHref(userId: string) {
  const profile = await getClientProfile(userId);
  return clientPostAuthHref(Boolean(profile?.onboardingComplete));
}

/** Landing route for an authenticated session, or null when unauthenticated/embed. */
export async function getAuthenticatedLandingHref(options?: {
  embed?: boolean;
}): Promise<string | null> {
  const session = await getAuthSession();

  if (!session?.user?.id || options?.embed) {
    return null;
  }

  if (isAdminSession(session)) {
    return OPERATOR_DASHBOARD_HREF;
  }

  if (session.user.email) {
    await bootstrapClientAfterAuth({
      userId: session.user.id,
      email: session.user.email,
    });
  }

  return resolveClientLandingHref(session.user.id);
}
