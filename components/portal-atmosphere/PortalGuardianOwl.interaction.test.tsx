import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  PortalAtmosphere,
  PortalGuardianOwl,
} from "@/components/portal-atmosphere";

describe("PortalGuardianOwl", () => {
  it("renders as a decorative atmosphere layer silent to assistive tech", () => {
    const { container } = render(
      <PortalAtmosphere theme="dark" layers={<PortalGuardianOwl />}>
        <main>Portal content</main>
      </PortalAtmosphere>,
    );

    const owl = container.querySelector("[data-portal-guardian-owl]");
    const images = container.querySelectorAll("img");

    expect(owl).not.toBeNull();
    expect(owl).toHaveAttribute("aria-hidden", "true");
    expect(images.length).toBeGreaterThan(0);
    for (const image of images) {
      expect(image).toHaveAttribute("alt", "");
      expect(image).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("renders nothing when showOwl is false", () => {
    const { container } = render(
      <PortalAtmosphere theme="dark" layers={<PortalGuardianOwl showOwl={false} />}>
        <main>Portal content</main>
      </PortalAtmosphere>,
    );

    expect(container.querySelector("[data-portal-guardian-owl]")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });

  it("renders owl in the layers slot below the content wrapper", () => {
    const { container } = render(
      <PortalAtmosphere theme="dark" layers={<PortalGuardianOwl />}>
        <main>Portal content</main>
      </PortalAtmosphere>,
    );

    const root = container.querySelector("[data-portal-atmosphere]");
    const owl = root?.querySelector("[data-portal-guardian-owl]");
    const content = root?.querySelector(".portal-atmosphere__content");

    expect(owl).not.toBeNull();
    expect(content).not.toBeNull();
    expect(content?.contains(owl ?? null)).toBe(false);
  });
});
