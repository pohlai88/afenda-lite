import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GuardianAuthFacade } from "@/components/auth";
import { ThemeProvider } from "@/components/theme-provider";
import { GUARDIAN_AUTH_ASSET_SET } from "@/lib/portal-brand";

function renderGuardian(ui: ReactNode) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe("GuardianAuthFacade interaction", () => {
  it("renders access slot children and editorial zones", () => {
    const { container } = renderGuardian(
      <GuardianAuthFacade mode="night" assets={GUARDIAN_AUTH_ASSET_SET}>
        <div data-testid="neon-slot">Neon form slot</div>
      </GuardianAuthFacade>,
    );

    expect(screen.getByTestId("neon-slot")).toBeInTheDocument();
    expect(container.querySelector(".guardian-auth__left-panel")).toBeTruthy();
    expect(container.querySelector(".guardian-auth__card-zone")).toBeTruthy();
    expect(container.querySelector(".access-vault")).toBeNull();
  });

  it("uses custom left panel when provided", () => {
    renderGuardian(
      <GuardianAuthFacade
        mode="night"
        assets={GUARDIAN_AUTH_ASSET_SET}
        leftPanel={<div data-testid="join-brand">Join brand</div>}
      >
        <div>Access</div>
      </GuardianAuthFacade>,
    );

    expect(screen.getByTestId("join-brand")).toBeInTheDocument();
  });

  it("toggles theme via the facade control", async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();

    renderGuardian(
      <GuardianAuthFacade
        mode="night"
        assets={GUARDIAN_AUTH_ASSET_SET}
        onModeChange={onModeChange}
      />,
    );

    const toggle = screen.getByRole("button", { name: /switch to day mode/i });
    await user.click(toggle);
    expect(onModeChange).toHaveBeenCalledWith("day");
  });
});
