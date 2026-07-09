import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PortalInvitationJoinPanel } from "./portal-invitation-join-panel";
import { portalCopy } from "@/lib/portal-copy";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
}));

describe("portal invitation join panel", () => {
  it("shows missing invitation error when invitationId is absent", () => {
    render(
      <PortalInvitationJoinPanel
        authView={{
          activeStep: 0,
          pathname: "sign-up",
          panelTitleKey: "panelCreateTitle",
          panelDescriptionKey: "panelCreateDescription",
        }}
      />,
    );

    expect(
      screen.getByRole("alert"),
    ).toHaveTextContent(portalCopy.clientInvitationJoin.missingInvitationError);
  });
});
