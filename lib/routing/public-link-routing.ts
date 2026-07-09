import "server-only";

import { isAdminSession } from "@/lib/admin";
import { getAuthSession } from "@/lib/auth/get-session";
import { bootstrapClientAfterAuth } from "@/lib/auth/bootstrap-client-invite";
import {
  CLIENT_LOGIN_REQUIRED_REASON,
  clientSignInAuthHref,
} from "@/lib/entry/client-sign-in-entry";
import {
  getActiveClientAssignmentForSurvey,
  getClientProfile,
} from "@/lib/domain/clients";
import {
  CLIENT_HOME_HREF,
  clientDeclareHref,
  clientPostAuthHref,
  operatorDeclarationHref,
} from "@/lib/routing/portal-routes";
import type { Survey } from "@/lib/domain/surveys";

export const publicLinkPageRobots = { index: false, follow: false } as const;

/**
 * Session-aware landing for S5 open (`/survey/[slug]`) and secure (`/f/[token]`) links.
 *
 * Authenticated clients without an active assignment fall back to `/client` (by design).
 * Operators route to `/dashboard/[surveyId]`. Unauthenticated users get sign-in + `returnTo`.
 *
 * **Not** for S6 legacy `/invite/[token]` — use `legacy-invite-entry.ts`.
 */
export async function resolvePublicLinkLandingHref(
  survey: Survey,
  options?: { returnTo?: string },
): Promise<string> {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return clientSignInAuthHref(CLIENT_LOGIN_REQUIRED_REASON, options?.returnTo);
  }

  if (isAdminSession(session)) {
    return operatorDeclarationHref(survey.id);
  }

  if (session.user.email) {
    await bootstrapClientAfterAuth({
      userId: session.user.id,
      email: session.user.email,
    });

    const profile = await getClientProfile(session.user.id);
    const postAuthHref = clientPostAuthHref(Boolean(profile?.onboardingComplete));
    if (postAuthHref !== CLIENT_HOME_HREF) {
      return postAuthHref;
    }

    const assignment = await getActiveClientAssignmentForSurvey(
      session.user.email,
      survey.id,
    );
    if (assignment) {
      return clientDeclareHref(assignment.id);
    }
  }

  return CLIENT_HOME_HREF;
}
