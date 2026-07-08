import type { ReactNode } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_PORTAL_EDITORIAL_COPY,
  PortalAtmosphere,
  PortalEditorialHero,
  PortalSealLine,
} from "@/components/portal-atmosphere";

function renderSealInBrandSlot(seal: ReactNode) {
  return render(
    <PortalAtmosphere
      theme="dark"
      brand={
        <>
          <PortalEditorialHero theme="dark" suppressPageHeading />
          {seal}
        </>
      }
    />,
  );
}

describe("PortalSealLine", () => {
  it("renders default institutional seal copy as decorative only", () => {
    const { container } = renderSealInBrandSlot(<PortalSealLine />);

    const seal = container.querySelector("[data-portal-seal-line]");
    const text = container.querySelector(".portal-seal-line__text");

    expect(text?.textContent).toBe("SECURE · CONFIDENTIAL · VERIFIED");
    expect(seal).toHaveAttribute("aria-hidden", "true");
  });

  it("uses flow layout inside the brand slot (PA-P8)", () => {
    const { container } = renderSealInBrandSlot(<PortalSealLine />);

    const seal = container.querySelector(".portal-seal-line");
    expect(seal).toBeTruthy();
    expect(container.querySelector(".portal-atmosphere__brand")).toContainElement(
      seal as HTMLElement,
    );
  });

  it("marks icon silent to assistive tech", () => {
    const { container } = renderSealInBrandSlot(<PortalSealLine />);

    const icon = container.querySelector(".portal-seal-line__icon");

    expect(icon).toHaveAttribute("aria-hidden", "true");
  });

  it("renders nothing when showSeal is false", () => {
    const { container } = renderSealInBrandSlot(
      <PortalSealLine showSeal={false} />,
    );

    expect(container.querySelector("[data-portal-seal-line]")).toBeNull();
  });

  it("supports custom editorial seal copy", () => {
    const { container } = renderSealInBrandSlot(
      <PortalSealLine
        copy={{
          ...DEFAULT_PORTAL_EDITORIAL_COPY,
          seal: "SECURE · PRIVATE · VERIFIED",
        }}
      />,
    );

    expect(container.querySelector(".portal-seal-line__text")?.textContent).toBe(
      "SECURE · PRIVATE · VERIFIED",
    );
  });
});
