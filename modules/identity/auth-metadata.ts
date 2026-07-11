import type { Metadata } from "next";
import { PORTAL_NAME, portalCopy } from "@/modules/platform/copy/portal-copy";
import { isOrgSignInFrom, ORG_SIGN_IN_FROM_PARAM } from "@/modules/identity/auth/auth-entry-params";

const { metadata: meta } = portalCopy;

export function portalAuthMetadata(
  path: string,
  options?: { from?: string },
): Metadata {
  if (isOrgSignInFrom(options?.from) && path === "sign-in") {
    return {
      title: `${PORTAL_NAME} — ${meta.orgLogin.title}`,
      description: meta.orgLogin.description,
    };
  }

  switch (path) {
    case "sign-up":
      return {
        title: `${PORTAL_NAME} — ${meta.authSignUp.title}`,
        description: meta.authSignUp.description,
      };
    case "forgot-password":
      return {
        title: `${PORTAL_NAME} — ${meta.authForgotPassword.title}`,
        description: meta.authForgotPassword.description,
      };
    case "reset-password":
      return {
        title: `${PORTAL_NAME} — ${meta.authResetPassword.title}`,
        description: meta.authResetPassword.description,
      };
    case "sign-out":
      return {
        title: `${PORTAL_NAME} — ${meta.authSignOut.title}`,
        description: meta.authSignOut.description,
      };
    case "accept-invitation":
      return {
        title: `${PORTAL_NAME} — ${meta.clientInvitationJoin.title}`,
        description: portalCopy.organizationAuth.acceptInvitationDescription,
      };
    case "email-otp":
      return {
        title: `${PORTAL_NAME} — ${meta.authEmailOtp.title}`,
        description: meta.authEmailOtp.description,
      };
    case "magic-link":
      return {
        title: `${PORTAL_NAME} — ${meta.authMagicLink.title}`,
        description: meta.authMagicLink.description,
      };
    default:
      return {
        title: `${PORTAL_NAME} — ${meta.home.title}`,
        description: meta.home.description,
      };
  }
}

export { ORG_SIGN_IN_FROM_PARAM };
