export type JoinInvitationAuthView =
  | { activeStep: 0; pathname: "sign-up"; panelTitleKey: "panelCreateTitle"; panelDescriptionKey: "panelCreateDescription" }
  | { activeStep: 1; pathname: "email-otp"; panelTitleKey: "panelVerifyTitle"; panelDescriptionKey: "panelVerifyDescription" }
  | { activeStep: 2; pathname: "accept-invitation"; panelTitleKey: "panelAcceptTitle"; panelDescriptionKey: "panelAcceptDescription" };

export function resolveJoinInvitationAuthView(input: {
  isPending: boolean;
  isAuthenticated: boolean;
  emailVerified: boolean;
}): JoinInvitationAuthView {
  if (input.isPending || !input.isAuthenticated) {
    return {
      activeStep: 0,
      pathname: "sign-up",
      panelTitleKey: "panelCreateTitle",
      panelDescriptionKey: "panelCreateDescription",
    };
  }

  if (!input.emailVerified) {
    return {
      activeStep: 1,
      pathname: "email-otp",
      panelTitleKey: "panelVerifyTitle",
      panelDescriptionKey: "panelVerifyDescription",
    };
  }

  return {
    activeStep: 2,
    pathname: "accept-invitation",
    panelTitleKey: "panelAcceptTitle",
    panelDescriptionKey: "panelAcceptDescription",
  };
}
