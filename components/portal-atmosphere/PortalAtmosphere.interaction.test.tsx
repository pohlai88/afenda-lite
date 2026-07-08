import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PortalAtmosphere } from "./PortalAtmosphere";

describe("PortalAtmosphere", () => {
  it("renders a token-governed atmosphere shell with background layers", () => {
    render(
      <PortalAtmosphere theme="dark">
        <main>Portal content</main>
      </PortalAtmosphere>,
    );

    const content = screen.getByText("Portal content");
    const root = content.closest("[data-portal-atmosphere]");

    expect(root).not.toBeNull();
    expect(root).toHaveAttribute("data-portal-theme", "dark");
    expect(root).toHaveAttribute("data-portal-inversion", "dark-truth-readable");
    expect(root).toHaveClass("portal-atmosphere");
    expect(root).toHaveClass("portal-atmosphere-theme-dark");

    const layers = root?.querySelector("[data-portal-background-layers]");

    expect(layers).not.toBeNull();
  });

  it("can render without background layers when explicitly disabled", () => {
    render(
      <PortalAtmosphere theme="light" withBackgroundLayers={false}>
        <main>Plain content</main>
      </PortalAtmosphere>,
    );

    const content = screen.getByText("Plain content");
    const root = content.closest("[data-portal-atmosphere]");

    expect(root).toHaveAttribute("data-portal-theme", "light");
    expect(root).toHaveAttribute("data-portal-inversion", "light-protected-readable");
    expect(root?.querySelector("[data-portal-background-layers]")).toBeNull();
  });

  it("renders optional atmosphere layers outside the content wrapper", () => {
    render(
      <PortalAtmosphere
        theme="dark"
        layers={<div data-testid="atmosphere-layer">Layer</div>}
      >
        <main>Layered content</main>
      </PortalAtmosphere>,
    );

    const root = screen.getByText("Layered content").closest("[data-portal-atmosphere]");
    const layer = root?.querySelector("[data-testid='atmosphere-layer']");
    const content = root?.querySelector(".portal-atmosphere__content");

    expect(layer).not.toBeNull();
    expect(content?.contains(layer ?? null)).toBe(false);
  });

  it("renders PA-P8 layout slots in access-first DOM order", () => {
    const { container } = render(
      <PortalAtmosphere
        theme="dark"
        header={<div>Toolbar</div>}
        accessSlot={<div>Access chamber</div>}
        brand={<div>Editorial brand</div>}
      />,
    );

    const layout = container.querySelector(".portal-atmosphere__layout");
    const slotOrder = layout
      ? Array.from(layout.children).map((node) => node.className)
      : [];

    expect(slotOrder).toEqual([
      "portal-atmosphere__header",
      "portal-atmosphere__access",
      "portal-atmosphere__brand",
    ]);
    expect(screen.getByText("Access chamber")).toBeInTheDocument();
    expect(screen.getByText("Editorial brand")).toBeInTheDocument();
  });

  it("omits empty layout slots so grid areas do not reserve ghost rows", () => {
    const { container } = render(
      <PortalAtmosphere theme="dark" brand={<div>Editorial only</div>} />,
    );

    expect(container.querySelector(".portal-atmosphere__header")).toBeNull();
    expect(container.querySelector(".portal-atmosphere__access")).toBeNull();
    expect(container.querySelector(".portal-atmosphere__brand")).not.toBeNull();
    expect(container.querySelector(".portal-atmosphere__layout")).toHaveAttribute(
      "data-portal-layout-brand",
      "true",
    );
  });

  it("ignores children when PA-P8 layout slots are active", () => {
    render(
      <PortalAtmosphere
        theme="dark"
        brand={<div>Brand slot</div>}
        accessSlot={<div>Access slot</div>}
      >
        <div>Orphan child</div>
      </PortalAtmosphere>,
    );

    expect(screen.queryByText("Orphan child")).not.toBeInTheDocument();
    expect(screen.getByText("Brand slot")).toBeInTheDocument();
    expect(screen.getByText("Access slot")).toBeInTheDocument();
  });
});
