import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PortalEditorialHero } from "./PortalEditorialHero";
import { PORTAL_EDITORIAL_HEADING } from "./contracts/portal-editorial.contract";
import { PortalGuardianOwl } from "./PortalGuardianOwl";
import { PortalLaptopHeroPreview } from "./fixtures/portal-laptop-hero-preview.fixture";
import {
  FadeOwlPreview,
} from "./fixtures/fade-owl.fixture";
import { PortalSealLine } from "./PortalSealLine";

describe("portal atmosphere accessibility", () => {
  it("renders one semantic heading for the editorial statement", () => {
    render(<PortalEditorialHero theme="dark" />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: PORTAL_EDITORIAL_HEADING,
      }),
    ).toBeInTheDocument();
  });

  it("can suppress the page heading for PA-P10 integration pattern B", () => {
    render(<PortalEditorialHero theme="light" suppressPageHeading />);

    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  });

  it("keeps owl and seal decorative", () => {
    const { container } = render(
      <>
        <PortalGuardianOwl />
        <PortalSealLine />
      </>,
    );

    expect(container.querySelector(".portal-guardian-owl")).toHaveAttribute(
      "aria-hidden",
      "true",
    );

    expect(container.querySelector(".portal-seal-line")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("comp-laptop fixture renders one h1 with decorative layers hidden", () => {
    const { container } = render(<PortalLaptopHeroPreview theme="dark" />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 1, name: PORTAL_EDITORIAL_HEADING }),
    ).toHaveClass("sr-only");

    expect(container.querySelector(".portal-celestial-deco")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("fade-owl fixture uses visible editorial h1 per Gemini concept", () => {
    render(<FadeOwlPreview mode="night" />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Truth,\s*held quietly\./,
      }),
    ).not.toHaveClass("sr-only");
  });
});
