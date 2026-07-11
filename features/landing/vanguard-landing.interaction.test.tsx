import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { VanguardLanding } from "@/features/landing/vanguard-landing";
import { renderPortal } from "@/testing/react";

describe("VanguardLanding", () => {
  it("exposes a single Open authentication link to the sign-in route", () => {
    renderPortal(<VanguardLanding signInHref="/auth/sign-in?reason=login-required" />);

    const link = screen.getByRole("link", { name: "Open authentication" });
    expect(link.getAttribute("href")).toBe(
      "/auth/sign-in?reason=login-required",
    );
    expect(document.querySelectorAll("[data-landing-hotspot]")).toHaveLength(1);
  });

  it("keeps the sign-in href focusable for keyboard entry", async () => {
    const user = userEvent.setup();
    renderPortal(<VanguardLanding signInHref="/auth/sign-in" />);

    const link = screen.getByRole("link", { name: "Open authentication" });
    await user.tab();
    expect(link).toBe(document.activeElement);
  });

  it("preserves the sign-in href on click", async () => {
    const user = userEvent.setup();
    renderPortal(<VanguardLanding signInHref="/auth/sign-in" />);

    const link = screen.getByRole("link", { name: "Open authentication" });
    await user.click(link);
    expect(link.getAttribute("href")).toBe("/auth/sign-in");
  });
});
