import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  PortalAtmosphere,
  PortalEditorialHero,
  resolveSharpEditorialHeading,
} from "@/components/portal-atmosphere";
import { PortalAtmospherePreview } from "./fixtures/portal-atmosphere-preview.fixture";

describe("PortalEditorialHero", () => {
  it("renders one semantic h1 for the sharp preview default", () => {
    render(
      <PortalAtmospherePreview
        theme="dark"
        showSeal={false}
        showAccessSlot={false}
      />,
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: resolveSharpEditorialHeading("dark"),
      }),
    ).toHaveClass("sr-only");

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("marks the visual editorial hero as decorative", () => {
    const { container } = render(
      <PortalAtmospherePreview
        theme="dark"
        showSeal={false}
        showAccessSlot={false}
      />,
    );

    expect(container.querySelector(".portal-editorial-hero")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("suppresses atmosphere h1 for PA-P10 heading ownership Pattern B", () => {
    render(
      <PortalAtmospherePreview
        theme="dark"
        showSeal={false}
        showAccessSlot={false}
        suppressPageHeading
      />,
    );

    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  });

  it("flips protected in dark mode only for classic variant", () => {
    const { container } = render(
      <PortalAtmospherePreview
        theme="dark"
        editorialVariant="classic"
        showSeal={false}
        showAccessSlot={false}
      />,
    );

    expect(
      container.querySelector(".portal-hero-word--truth"),
    ).not.toHaveClass("portal-hero-word--inverted");

    expect(
      container.querySelector(".portal-hero-word--protected"),
    ).toHaveClass("portal-hero-word--inverted");
  });

  it("flips truth in light mode only for classic variant", () => {
    const { container } = render(
      <PortalAtmospherePreview
        theme="light"
        editorialVariant="classic"
        showSeal={false}
        showAccessSlot={false}
      />,
    );

    expect(container.querySelector(".portal-hero-word--truth")).toHaveClass(
      "portal-hero-word--inverted",
    );

    expect(
      container.querySelector(".portal-hero-word--protected"),
    ).not.toHaveClass("portal-hero-word--inverted");
  });

  it("renders sharp sentence headline markup by default in preview", () => {
    const { container } = render(
      <PortalAtmospherePreview
        theme="dark"
        showSeal={false}
        showAccessSlot={false}
      />,
    );

    expect(
      container.querySelector(".portal-editorial-hero--sharp"),
    ).not.toBeNull();
    expect(container.querySelector(".portal-hero-headline")).toHaveTextContent(
      "Truth, held quietly.",
    );
    expect(container.querySelector(".portal-hero-divider__gem")).toHaveTextContent(
      "◆",
    );
  });

  it("uses copy supplied through the editorial copy contract", () => {
    render(
      <PortalAtmosphere
        theme="dark"
        brand={
          <PortalEditorialHero
            theme="dark"
            copy={{
              truth: "INTEGRITY",
              connector: "REMAINS",
              protected: "GUARDED",
            }}
          />
        }
      />,
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "integrity remains guarded",
      }),
    ).toBeInTheDocument();
  });
});
