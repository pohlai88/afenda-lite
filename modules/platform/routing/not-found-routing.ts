import "server-only";

import type { Metadata } from "next";
import { isAdminSession } from "@/modules/identity/admin";
import { getAuthSession } from "@/modules/identity/auth/get-session";
import { PORTAL_NAME, portalCopy } from "@/modules/platform/copy/portal-copy";
import {
  AUTH_SIGN_IN_HREF,
  CLIENT_HOME_HREF,
  ORGANIZATION_ADMIN_DASHBOARD_HREF,
} from "@/modules/platform/routing/portal-routes";

export const notFoundPageMetadata: Metadata = {
  title: `${PORTAL_NAME} — ${portalCopy.notFound.title}`,
  description: portalCopy.notFound.description,
  robots: { index: false, follow: false },
};

export async function resolveNotFoundDestination() {
  const { notFound } = portalCopy;
  const session = await getAuthSession();
  const isClient = Boolean(session?.user?.id && !isAdminSession(session));
  const isOrganizationAdmin = isAdminSession(session);

  if (isOrganizationAdmin) {
    return {
      backHref: ORGANIZATION_ADMIN_DASHBOARD_HREF,
      backLabel: notFound.backLabelOrg,
    };
  }

  if (isClient) {
    return {
      backHref: CLIENT_HOME_HREF,
      backLabel: notFound.backLabelClient,
    };
  }

  return {
    backHref: AUTH_SIGN_IN_HREF,
    backLabel: notFound.backLabel,
  };
}
