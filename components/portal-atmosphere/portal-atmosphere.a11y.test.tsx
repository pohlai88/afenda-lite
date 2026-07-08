import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PortalEditorialHero } from "./PortalEditorialHero";
import { PORTAL_EDITORIAL_HEADING } from "./contracts/portal-editorial.contract";
import { PortalGuardianOwl } from "./PortalGuardianOwl";
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
});
