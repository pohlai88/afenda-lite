import { describe, expect, it } from "vitest";
import {
  resolveJoinInvitationAuthView,
  resolveJoinInvitationTrustNotice,
} from "@/lib/client-invitation-join-auth";
import { portalCopy } from "@/lib/portal-copy";

describe("resolveJoinInvitationAuthView", () => {
  it("shows sign-up while session is pending", () => {
    expect(
      resolveJoinInvitationAuthView({
        isPending: true,
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

describe("resolveJoinInvitationTrustNotice", () => {
  it("uses join copy for sign-up and accept steps", () => {
    expect(
      resolveJoinInvitationTrustNotice({
        activeStep: 0,
        pathname: "sign-up",
        panelTitleKey: "panelCreateTitle",
        panelDescriptionKey: "panelCreateDescription",
      }),
    ).toBe(portalCopy.clientInvitationJoin.trustNotice);

    expect(
      resolveJoinInvitationTrustNotice({
        activeStep: 2,
        pathname: "accept-invitation",
        panelTitleKey: "panelAcceptTitle",
        panelDescriptionKey: "panelAcceptDescription",
      }),
    ).toBe(portalCopy.clientInvitationJoin.trustNotice);
  });

  it("uses email OTP copy on verify step", () => {
    expect(
      resolveJoinInvitationTrustNotice({
        activeStep: 1,
        pathname: "email-otp",
        panelTitleKey: "panelVerifyTitle",
        panelDescriptionKey: "panelVerifyDescription",
      }),
    ).toBe(portalCopy.emailOtp.trustNotice);
  });
});
