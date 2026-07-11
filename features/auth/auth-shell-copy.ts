import { portalCopy } from "@/modules/platform/copy/portal-copy";
import {
  AUTH_SIGN_IN_HREF,
  ORG_SIGN_IN_HREF,
} from "@/modules/platform/routing/portal-routes";
import {
  isOrgSignInFrom,
  ORG_SIGN_IN_FROM_PARAM,
} from "@/modules/identity/auth/auth-entry-params";

export type AuthShellCopy = {
  eyebrow: string;
  heroTitle: string;
  heroDescription: string;
  signInTitle: string;
  signInDescription: string;
  trustNotice: string;
  alternateLink: { href: string; label: string };
  footerHint?: string;
  constraintHint?: string;
  signInHeadingId?: string;
};

const clientAuthCopyByPath: Record<
  string,
  Pick<
    AuthShellCopy,
    | "signInTitle"
    | "signInDescription"
    | "alternateLink"
    | "signInHeadingId"
    | "constraintHint"
  >
> = {
  "sign-in": {
    signInTitle: portalCopy.signIn.title,
    signInDescription: portalCopy.signIn.description,
    alternateLink: { href: ORG_SIGN_IN_HREF, label: portalCopy.signIn.orgLink },
  },
  "sign-up": {
    signInTitle: portalCopy.metadata.authSignUp.title,
    signInDescription: portalCopy.metadata.authSignUp.description,
    alternateLink: { href: AUTH_SIGN_IN_HREF, label: "Back to sign in" },
    constraintHint: portalCopy.signUp.passwordRequirements,
  },
  "forgot-password": {
    signInTitle: portalCopy.metadata.authForgotPassword.title,
    signInDescription: portalCopy.metadata.authForgotPassword.description,
    alternateLink: { href: AUTH_SIGN_IN_HREF, label: "Back to sign in" },
    constraintHint:
      "Reset links expire after 15 minutes and can only be used once.",
  },
  "reset-password": {
    signInTitle: portalCopy.metadata.authResetPassword.title,
    signInDescription: portalCopy.metadata.authResetPassword.description,
    alternateLink: { href: AUTH_SIGN_IN_HREF, label: "Back to sign in" },
    constraintHint: portalCopy.signUp.passwordRequirements,
  },
  "sign-out": {
    signInTitle: portalCopy.metadata.authSignOut.title,
    signInDescription: portalCopy.metadata.authSignOut.description,
    alternateLink: { href: AUTH_SIGN_IN_HREF, label: "Sign in again" },
  },
  "accept-invitation": {
    signInTitle: portalCopy.organizationAuth.acceptInvitationTitle,
    signInDescription: portalCopy.organizationAuth.acceptInvitationDescription,
    alternateLink: { href: AUTH_SIGN_IN_HREF, label: "Back to sign in" },
    signInHeadingId: "accept-invitation-heading",
  },
  "email-otp": {
    signInTitle: "Sign in with verification code",
    signInDescription: portalCopy.emailOtp.signInDescription,
    alternateLink: { href: AUTH_SIGN_IN_HREF, label: "Sign in with password" },
    constraintHint: portalCopy.emailOtp.codeExpiryHint,
  },
  "magic-link": {
    signInTitle: portalCopy.metadata.authMagicLink.title,
    signInDescription: portalCopy.magicLink.signInDescription,
    alternateLink: { href: AUTH_SIGN_IN_HREF, label: "Sign in with password" },
    constraintHint:
      "Sign-in links expire after 15 minutes and can only be used once.",
  },
};

export function resolveAuthShellCopy(input: {
  path: string;
  from?: string;
}): AuthShellCopy {
  const pathCopy = clientAuthCopyByPath[input.path] ?? clientAuthCopyByPath["sign-in"];
  const fromOrg = isOrgSignInFrom(input.from) && input.path === "sign-in";

  if (fromOrg) {
    const { orgSignIn, product, trust } = portalCopy;
    return {
      eyebrow: product.portalEyebrow,
      heroTitle: orgSignIn.heroTitle,
      heroDescription: orgSignIn.heroDescription,
      signInTitle: orgSignIn.title,
      signInDescription: orgSignIn.description,
      trustNotice: trust.notices.orgLogin,
      alternateLink: {
        href: AUTH_SIGN_IN_HREF,
        label: orgSignIn.clientLink,
      },
      signInHeadingId: "org-sign-in-heading",
    };
  }

  const { signIn, product, trust } = portalCopy;
  return {
    eyebrow: product.portalEyebrow,
    heroTitle: signIn.heroTitle,
    heroDescription: signIn.heroDescription,
    signInTitle: pathCopy.signInTitle,
    signInDescription: pathCopy.signInDescription,
    trustNotice: trust.notices.clientLogin,
    alternateLink: pathCopy.alternateLink,
    footerHint: input.path === "sign-in" ? signIn.inviteHint : undefined,
    constraintHint: pathCopy.constraintHint,
    signInHeadingId: pathCopy.signInHeadingId,
  };
}

export { ORG_SIGN_IN_FROM_PARAM };
