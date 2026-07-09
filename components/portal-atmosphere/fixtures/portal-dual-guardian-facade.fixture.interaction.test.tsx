import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PORTAL_EDITORIAL_HEADING } from "../contracts/portal-editorial.contract";
import { PortalDualGuardianFacade } from "./portal-dual-guardian-facade.fixture";

describe("portal dual guardian facade fixture", () => {
  it("renders the dual-guardian modifier with both owls present together", () => {
    const { container } = render(<PortalDualGuardianFacade />);

    expect(
      container.querySelector(".portal-atmosphere--dual-guardian"),
    ).toBeTruthy();
    expect(
      container.querySelector('[data-portal-dual-guardian-owl="dark"]'),
    ).toBeTruthy();
    expect(
      container.querySelector('[data-portal-dual-guardian-owl="light"]'),
    ).toBeTruthy();
  });

  it("exposes one h1 and a labelled Access Vault section", () => {
    render(<PortalDualGuardianFacade />);

    expect(
      screen.getByRole("heading", { level: 1, name: PORTAL_EDITORIAL_HEADING }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { level: 2, name: "Access Vault" }),
    ).toBeInTheDocument();
  });

  it("keeps owls, brandmark, seal, and celestial deco decorative", () => {
    const { container } = render(<PortalDualGuardianFacade />);

    expect(container.querySelector(".portal-dual-guardian-owls")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(
      container.querySelector(".portal-dual-guardian-facade__brandmark"),
    ).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector(".portal-seal-line")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(container.querySelector(".portal-dual-guardian-deco")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("excludes the mock vault form from the accessibility tree", () => {
    const { container } = render(<PortalDualGuardianFacade />);

    expect(
      container.querySelector(".portal-vault-threshold__mock-form"),
    ).toHaveAttribute("aria-hidden", "true");
  });
});
