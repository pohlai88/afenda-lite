import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/get-session";
import { resolvePortalMember } from "@/lib/portal-member";
import type { PortalMember } from "@/lib/portal-member-types";
import { AUTH_SIGN_IN_HREF } from "@/lib/portal-routes";

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
