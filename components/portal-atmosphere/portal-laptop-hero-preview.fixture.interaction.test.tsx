import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PortalLaptopHeroPreview } from "./fixtures/portal-laptop-hero-preview.fixture";
import { PORTAL_EDITORIAL_HEADING } from "./contracts/portal-editorial.contract";

describe("portal laptop hero preview fixture", () => {
  it("renders comp-laptop modifier with comp-base owl and theme surface", () => {
    const { container } = render(<PortalLaptopHeroPreview theme="dark" />);

    expect(container.querySelector(".portal-atmosphere--comp-laptop")).toBeTruthy();
    expect(container.querySelector('[data-portal-theme="dark"]')).toBeTruthy();
    expect(
      container.querySelector('[data-portal-guardian-owl-preset="comp-base"]'),
    ).toBeTruthy();
    expect(container.querySelector(".portal-guardian-owl--comp-base")).toBeTruthy();
  });

  it("exposes one sr-only h1 and labelled vault section", () => {
    render(<PortalLaptopHeroPreview theme="light" />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: PORTAL_EDITORIAL_HEADING,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { level: 2, name: "Access Vault" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Access Vault" }),
    ).toHaveClass("portal-access-vault-placeholder__title");
  });

  it("keeps owl, seal, and celestial deco decorative", () => {
    const { container } = render(<PortalLaptopHeroPreview theme="dark" />);

    expect(container.querySelector(".portal-guardian-owl")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(container.querySelector(".portal-seal-line")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(container.querySelector(".portal-celestial-deco")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("excludes mock vault form from accessibility tree", () => {
    const { container } = render(<PortalLaptopHeroPreview theme="dark" />);

    expect(
      container.querySelector(".portal-access-placeholder__mock-form"),
    ).toHaveAttribute("aria-hidden", "true");
  });
});
