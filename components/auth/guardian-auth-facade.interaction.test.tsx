import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GuardianAuthFacade } from "@/components/auth";
import { ThemeProvider } from "@/components/theme-provider";
import { GUARDIAN_AUTH_ASSET_SET } from "@/lib/copy/portal-brand";

function renderGuardian(ui: ReactNode) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe("GuardianAuthFacade interaction", () => {
  it("renders access slot, sky-cycle copy sets, and ambient class", () => {
    const { container } = renderGuardian(
      <GuardianAuthFacade mode="night" assets={GUARDIAN_AUTH_ASSET_SET}>
        <div data-testid="neon-slot">Neon form slot</div>
      </GuardianAuthFacade>,
    );

    expect(screen.getByTestId("neon-slot")).toBeInTheDocument();
    expect(container.querySelector(".guardian-auth__left-panel")).toBeTruthy();
    expect(container.querySelector(".guardian-auth__card-zone")).toBeTruthy();
    expect(container.querySelector(".access-vault")).toBeNull();
    expect(container.querySelector(".editorial-copy--sky")).toBeTruthy();
    expect(container.querySelector('[data-guardian-editorial-set="day"]')).toBeTruthy();
    expect(container.querySelector('[data-guardian-editorial-set="night"]')).toBeTruthy();
    expect(container.querySelector(".editorial-copy__word--inverted")).toBeNull();
    expect(container.querySelector(".guardian-auth--ambient")).toBeTruthy();
    expect(container.querySelector(".owl-scene__grain")).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 1, name: /truth, held quietly/i }),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-guardian-identity="night"]'),
    ).toBeTruthy();
  });

  it("shows day headline when mode is day and uses light identity", () => {
    const { container } = renderGuardian(
      <GuardianAuthFacade mode="day" assets={GUARDIAN_AUTH_ASSET_SET} />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: /protected by clarity/i }),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-guardian-identity="day"]'),
    ).toBeTruthy();
    expect(container.querySelector(".access-vault__magic")).toBeTruthy();
    expect(container.querySelector(".access-vault__google")).toBeTruthy();
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

  it("toggles theme and pauses ambient sky cycle", async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();

    const { container } = renderGuardian(
      <GuardianAuthFacade
        mode="night"
        assets={GUARDIAN_AUTH_ASSET_SET}
        onModeChange={onModeChange}
      />,
    );

    expect(container.querySelector(".guardian-auth--ambient")).toBeTruthy();

    const toggle = screen.getByRole("button", { name: /prefer day sky/i });
    await user.click(toggle);
    expect(onModeChange).toHaveBeenCalledWith("day");
    expect(container.querySelector(".guardian-auth--ambient")).toBeNull();
    expect(container.querySelector(".guardian-auth--ambient-paused")).toBeTruthy();
  });
});
