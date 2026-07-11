import "server-only";

/** S1 adjunct — post-auth landing dispatch for `/`, `/client/login`, and `/org/login`. */
import { isAdminSession } from "@/modules/identity/admin";
import { getAuthSession } from "@/modules/identity/auth/get-session";
import { bootstrapClientAfterAuth } from "@/modules/identity/auth/bootstrap-client-invite";
import { getClientProfile } from "@/modules/identity/domain/client-profile";
import {
  clientPostAuthHref,
  ORGANIZATION_ADMIN_DASHBOARD_HREF,
} from "@/modules/platform/routing/portal-routes";

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
    return ORGANIZATION_ADMIN_DASHBOARD_HREF;
  }

  if (session.user.email) {
    await bootstrapClientAfterAuth({
      userId: session.user.id,
      email: session.user.email,
    });
  }

  return resolveClientLandingHref(session.user.id);
}
