import "server-only";

/** S1 adjunct — account self-service session (`/account/*`) using `getAuthSession`. */
import { cache } from "react";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/modules/identity/auth/get-session";
import { resolvePortalMember } from "@/modules/identity/portal-member";
import type { PortalMember } from "@/modules/identity/portal-member-types";
import { AUTH_SIGN_IN_HREF } from "@/modules/platform/routing/portal-routes";

export const requireAccountSession = cache(async (): Promise<PortalMember> => {
  const session = await getAuthSession();

  if (!session?.user) {
    redirect(AUTH_SIGN_IN_HREF);
  }

  const member = await resolvePortalMember(session);
  if (!member) {
    redirect(AUTH_SIGN_IN_HREF);
  }

  return member;
});
