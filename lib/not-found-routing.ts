import "server-only";

import type { Metadata } from "next";
import { isAdminSession } from "@/lib/admin";
import { getAuthSession } from "@/lib/auth/get-session";
import { PORTAL_NAME, portalCopy } from "@/lib/portal-copy";
import {
  AUTH_SIGN_IN_HREF,
  CLIENT_HOME_HREF,
  OPERATOR_DASHBOARD_HREF,
} from "@/lib/portal-routes";

export const notFoundPageMetadata: Metadata = {
  title: `${PORTAL_NAME} — ${portalCopy.notFound.title}`,
  description: portalCopy.notFound.description,
  robots: { index: false, follow: false },
};

export async function resolveNotFoundDestination() {
  const { notFound } = portalCopy;
  const session = await getAuthSession();
  const isClient = Boolean(session?.user?.id && !isAdminSession(session));
  const isOperator = isAdminSession(session);

  if (isOperator) {
    return {
      backHref: OPERATOR_DASHBOARD_HREF,
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
