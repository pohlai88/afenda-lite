import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  PortalAccessSlot,
  PortalAtmosphere,
} from "@/components/portal-atmosphere";
import { AccessSlotPlaceholder } from "./fixtures/access-slot-placeholder";

describe("PortalAccessSlot", () => {
  it("accepts children and renders the access area without auth imports", () => {
    render(
      <PortalAtmosphere theme="dark">
        <PortalAccessSlot>
          <div>Static child</div>
        </PortalAccessSlot>
      </PortalAtmosphere>,
    );

    expect(
      screen.getByRole("complementary", {
        name: "Access chamber",
      }),
    ).toBeInTheDocument();

    expect(screen.getByText("Static child")).toBeInTheDocument();
  });

  it("renders the static placeholder copy", () => {
    render(
      <PortalAtmosphere theme="light">
        <PortalAccessSlot>
          <AccessSlotPlaceholder />
        </PortalAccessSlot>
      </PortalAtmosphere>,
    );

    expect(screen.getByText("Access Vault")).toBeInTheDocument();
    expect(screen.getByText("Credential chamber")).toBeInTheDocument();
    expect(
      screen.getByText(/Placeholder only\. Authentication is not mounted/i),
    ).toBeInTheDocument();
  });

  it("keeps mock form controls decorative", () => {
    const { container } = render(
      <PortalAtmosphere theme="dark">
        <PortalAccessSlot>
          <AccessSlotPlaceholder />
        </PortalAccessSlot>
      </PortalAtmosphere>,
    );

    const mockForm = container.querySelector(
      ".portal-access-placeholder__mock-form",
    );

    expect(mockForm).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("input")).toBeNull();
    expect(container.querySelector("button")).toBeNull();
    expect(container.querySelector("form")).toBeNull();
  });
});
