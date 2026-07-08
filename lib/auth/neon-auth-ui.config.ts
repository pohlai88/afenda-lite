import manifest from "@/config/neon-auth.manifest.json";
import { authLocalization } from "@neondatabase/auth-ui";
import { CLIENT_ONBOARDING_HREF } from "@/lib/client-session";
import { neonAuthSocialConfigFromManifest } from "@/lib/auth/neon-auth-oauth";
import { PORTAL_NAME, portalCopy } from "@/lib/portal-copy";

/** Neon Auth UI routes — must match `app/auth/[path]` and proxy loginUrl. */
export const NEON_AUTH_UI_BASE_PATH = manifest.ui.basePath;

export const NEON_AUTH_ACCOUNT_BASE_PATH = manifest.ui.accountBasePath;

/** Closed feature set for NeonAuthUIProvider (mirrors materialized manifest). */
export const neonAuthUiFeatures = manifest.ui.features;

const credentialsFeature = neonAuthUiFeatures.credentials;

/** Email/password sign-in — forgot-password link enabled per Neon password-reset docs. */
export const neonAuthUiCredentials = {
  forgotPassword:
    typeof credentialsFeature === "object" &&
    credentialsFeature !== null &&
    "forgotPassword" in credentialsFeature
      ? credentialsFeature.forgotPassword
      : true,
};

const {
  signIn,
  emailOtp,
  magicLink,
  organizationAuth,
  passwordReset,
  account,
  userMenu,
} = portalCopy;

/** Signed-in user management — updateUser(name) + changePassword() via AccountView. */
export const neonAuthUiAccount = {
  basePath: NEON_AUTH_ACCOUNT_BASE_PATH,
  /** Neon Auth supports name updates; email change is disabled separately. */
  fields: ["name"] as string[],
};

/** Portal-aligned copy for Neon Auth UI — semantic tokens handle visual styling. */
export const neonAuthUiLocalization = {
  ...authLocalization,
  SIGN_IN: signIn.title,
  SIGN_IN_ACTION: signIn.submit,
  SIGN_IN_DESCRIPTION: signIn.description,
  SIGN_UP: portalCopy.metadata.authSignUp.title,
  SIGN_UP_DESCRIPTION: portalCopy.metadata.authSignUp.description,
  FORGOT_PASSWORD: portalCopy.metadata.authForgotPassword.title,
  FORGOT_PASSWORD_DESCRIPTION: passwordReset.forgotDescription,
  FORGOT_PASSWORD_EMAIL: passwordReset.linkSentNotice,
  RESET_PASSWORD: portalCopy.metadata.authResetPassword.title,
  RESET_PASSWORD_DESCRIPTION: passwordReset.resetDescription,
  EMAIL: signIn.emailLabel,
  EMAIL_PLACEHOLDER: signIn.emailPlaceholder,
  PASSWORD: signIn.passwordLabel,
  EMAIL_OTP: emailOtp.label,
  EMAIL_OTP_DESCRIPTION: emailOtp.signInDescription,
  EMAIL_OTP_SEND_ACTION: emailOtp.sendCodeAction,
  EMAIL_OTP_VERIFY_ACTION: emailOtp.verifyCodeAction,
  EMAIL_OTP_VERIFICATION_SENT: emailOtp.codeSentNotice,
  SEND_VERIFICATION_CODE: emailOtp.sendVerificationCodeAction,
  EMAIL_VERIFICATION: emailOtp.signUpVerificationNotice,
  RESEND_CODE: emailOtp.resendCodeAction,
  MAGIC_LINK: magicLink.label,
  MAGIC_LINK_ACTION: magicLink.sendLinkAction,
  MAGIC_LINK_DESCRIPTION: magicLink.signInDescription,
  MAGIC_LINK_EMAIL: magicLink.linkSentNotice,
  ORGANIZATION: portalCopy.nav.organization,
  CREATE_ORGANIZATION: "Create organization",
  ORGANIZATION_NAME: "Organization name",
  ORGANIZATION_NAME_PLACEHOLDER: manifest.project.projectName,
  INVITE_MEMBER_DESCRIPTION: organizationAuth.inviteMemberDescription,
  SEND_INVITATION: organizationAuth.sendInvitationAction,
  SEND_INVITATION_SUCCESS: organizationAuth.sendInvitationSuccess,
  ACCEPT_INVITATION: organizationAuth.acceptInvitationTitle,
  ACCEPT_INVITATION_DESCRIPTION: organizationAuth.acceptInvitationDescription,
  INVITATION_ACCEPTED: organizationAuth.acceptInvitationSuccess,
  INVITATION_EXPIRED: organizationAuth.invitationExpired,
  PENDING_INVITATIONS_DESCRIPTION: organizationAuth.pendingInvitationsDescription,
  SETTINGS: account.settings.title,
  SECURITY: userMenu.accountSecurity,
  NAME: account.management.displayNameLabel,
  NAME_DESCRIPTION: account.management.displayNameDescription,
  NAME_PLACEHOLDER: account.management.displayNamePlaceholder,
  CHANGE_PASSWORD: account.management.changePasswordTitle,
  CHANGE_PASSWORD_DESCRIPTION: account.management.changePasswordDescription,
  CHANGE_PASSWORD_INSTRUCTIONS: account.management.changePasswordInstructions,
  CHANGE_PASSWORD_SUCCESS: account.management.changePasswordSuccess,
  CURRENT_PASSWORD: account.management.currentPasswordLabel,
  CURRENT_PASSWORD_PLACEHOLDER: account.management.currentPasswordPlaceholder,
  NEW_PASSWORD: account.management.newPasswordLabel,
  NEW_PASSWORD_PLACEHOLDER: account.management.newPasswordPlaceholder,
} as const;

export const neonAuthUiProviderDefaults = {
  basePath: NEON_AUTH_UI_BASE_PATH,
  redirectTo: CLIENT_ONBOARDING_HREF,
  account: neonAuthUiAccount,
  /** Neon Auth user-management docs: email address changes are not supported. */
  changeEmail: false,
  credentials: neonAuthUiCredentials,
  signUp: neonAuthUiFeatures.signUp,
  organization: neonAuthUiFeatures.organization,
  emailOTP: neonAuthUiFeatures.emailOTP,
  emailVerification: neonAuthUiFeatures.emailVerification,
  magicLink: neonAuthUiFeatures.magicLink,
  social: neonAuthUiFeatures.social
    ? neonAuthSocialConfigFromManifest(manifest)
    : undefined,
  localization: neonAuthUiLocalization,
  defaultTheme: "system" as const,
} as const;

export const neonAuthUiApplicationName = PORTAL_NAME;
