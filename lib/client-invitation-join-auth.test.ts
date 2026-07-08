import { describe, expect, it } from "vitest";
import { resolveJoinInvitationAuthView } from "@/lib/client-invitation-join-auth";

describe("resolveJoinInvitationAuthView", () => {
  it("shows sign-up for unauthenticated users", () => {
    expect(
      resolveJoinInvitationAuthView({
        isPending: false,
        isAuthenticated: false,
        emailVerified: false,
      }),
    ).toEqual({
      activeStep: 0,
      pathname: "sign-up",
      panelTitleKey: "panelCreateTitle",
      panelDescriptionKey: "panelCreateDescription",
    });
  });

  it("shows email OTP when authenticated but email is unverified", () => {
    expect(
      resolveJoinInvitationAuthView({
        isPending: false,
        isAuthenticated: true,
        emailVerified: false,
      }),
    ).toEqual({
      activeStep: 1,
      pathname: "email-otp",
      panelTitleKey: "panelVerifyTitle",
      panelDescriptionKey: "panelVerifyDescription",
    });
  });

  it("shows accept invitation when authenticated and verified", () => {
    expect(
      resolveJoinInvitationAuthView({
        isPending: false,
        isAuthenticated: true,
        emailVerified: true,
      }),
    ).toEqual({
      activeStep: 2,
      pathname: "accept-invitation",
      panelTitleKey: "panelAcceptTitle",
      panelDescriptionKey: "panelAcceptDescription",
    });
  });
});
