import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { resolveSharpEditorialHeading } from "../contracts/portal-editorial.contract";
import { PortalAtmospherePreview } from "./portal-atmosphere-preview.fixture";

describe("PortalAtmospherePreview", () => {
  it("renders placeholder access slot without auth", () => {
    render(<PortalAtmospherePreview theme="dark" />);

    expect(screen.getByText("Access Vault")).toBeInTheDocument();
    expect(screen.getByText("Credential chamber")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Placeholder only. Authentication is not mounted in this fixture.",
      ),
    ).toBeInTheDocument();
  });

  it("renders semantic editorial heading", () => {
    render(<PortalAtmospherePreview theme="light" />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: resolveSharpEditorialHeading("light"),
      }),
    ).toBeInTheDocument();
  });

  it("can hide the owl layer for isolated access review", () => {
    const { container } = render(
      <PortalAtmospherePreview theme="dark" showOwl={false} />,
    );

    expect(container.querySelector("[data-portal-guardian-owl]")).toBeNull();
  });
});
