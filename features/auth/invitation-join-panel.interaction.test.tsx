import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { InvitationJoinPanel } from "@/features/auth/invitation-join-panel";
import type { JoinInvitationAuthView } from "@/modules/identity/client-invitation-join-auth";
import { renderPortal } from "@/testing/react";

vi.mock("@/features/auth/portal-auth-neon-view", () => ({
  PortalAuthNeonView: () => <div data-testid="neon-view" />,
}));

const signUpView: JoinInvitationAuthView = {
  pathname: "sign-up",
  activeStep: 0,
  panelTitleKey: "panelCreateTitle",
  panelDescriptionKey: "panelCreateDescription",
};

describe("InvitationJoinPanel", () => {
  it("shows missing-invitation alert when invitationId is absent", () => {
    renderPortal(
      <InvitationJoinPanel
        invitationId={null}
        authView={signUpView}
        isAuthenticated={false}
      />,
    );

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.queryByTestId("neon-view")).toBeNull();
  });

  it("renders Neon view when invitationId is present", () => {
    renderPortal(
      <InvitationJoinPanel
        invitationId="inv_test"
        authView={signUpView}
        isAuthenticated={false}
      />,
    );

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByTestId("neon-view")).toBeTruthy();
  });
});
