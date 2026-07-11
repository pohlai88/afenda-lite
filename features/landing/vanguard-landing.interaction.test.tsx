import { beforeAll, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { VanguardLanding } from "@/features/landing/vanguard-landing";
import {
  computeMagneticKey,
  phaseFromProximity,
  ritualReducer,
  initialRitualState,
} from "@/features/landing/ritual-engine";
import { renderPortal } from "@/testing/react";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

const props = {
  signInHref: "/auth/sign-in?reason=login-required",
  signUpHref: "/auth/sign-up?reason=login-required",
};

describe("ritual-engine", () => {
  it("snaps the key to the shield inside the insert radius", () => {
    const result = computeMagneticKey(
      { x: 100, y: 200 },
      { x: 110, y: 205, radius: 90 },
    );
    expect(result.proximity).toBe("insert");
    expect(result.keyX).toBe(110);
    expect(result.keyY).toBe(205);
  });

  it("attracts toward the shield inside the outer radius", () => {
    const shield = { x: 400, y: 400, radius: 80 };
    const result = computeMagneticKey({ x: 250, y: 400 }, shield);
    expect(result.proximity).toBe("attract");
    expect(result.keyX).toBeGreaterThan(250);
    expect(result.keyX).toBeLessThan(400);
  });

  it("advances proximity phases without illegal backslides while locked", () => {
    expect(phaseFromProximity("idle", "free", true)).toBe("tracking");
    expect(phaseFromProximity("tracking", "attract", true)).toBe("magnetized");
    expect(phaseFromProximity("magnetized", "insert", true)).toBe("inserted");
    expect(phaseFromProximity("quaking", "insert", true)).toBeNull();

    const locked = ritualReducer(
      { phase: "quaking", intent: "none" },
      { type: "SET_PHASE", phase: "tracking" },
    );
    expect(locked.phase).toBe("quaking");
  });

  it("supports direct unlock, dismiss, and depart intents", () => {
    const open = ritualReducer(initialRitualState, { type: "UNLOCK_DIRECT" });
    expect(open.phase).toBe("vaultOpen");

    const dismissed = ritualReducer(open, { type: "DISMISS" });
    expect(dismissed.phase).toBe("idle");

    const departing = ritualReducer(open, {
      type: "DEPART",
      intent: "signin",
    });
    expect(departing).toEqual({ phase: "departing", intent: "signin" });
  });
});

describe("VanguardLanding", () => {
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.show = function () {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute("open");
    };
  });

  it("keeps vault dialog closed until the shield unlocks", async () => {
    const user = userEvent.setup();
    renderPortal(<VanguardLanding {...props} />);

    const dialog = document.querySelector("dialog");
    expect(dialog).not.toHaveAttribute("open");

    await user.click(
      screen.getByRole("button", { name: "Unlock authentication options" }),
    );

    expect(dialog).toHaveAttribute("open");
    expect(screen.getByRole("link", { name: "Sign In" })).toHaveAttribute(
      "href",
      props.signInHref,
    );
    expect(
      screen.getByRole("link", { name: "Create Account" }),
    ).toHaveAttribute("href", props.signUpHref);
    expect(document.querySelector(".sovereign-vault-shell")).toHaveAttribute(
      "data-state",
      "open",
    );
    expect(document.querySelector(".sovereign-sky")).toBeInTheDocument();
    expect(document.querySelector(".sovereign-vault__art")).toHaveAttribute(
      "src",
      "/lynx/lynx-auth-popup.png",
    );
  });

  it("unlocks from the keyboard and moves focus to Sign In", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPortal(<VanguardLanding {...props} />);

    const shield = screen.getByRole("button", {
      name: "Unlock authentication options",
    });
    await user.tab();
    expect(shield).toBe(document.activeElement);

    await user.keyboard("{Enter}");

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    const dialog = document.querySelector("dialog");
    expect(dialog).toHaveAttribute("open");
    expect(shield).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Sign In" })).toBe(
      document.activeElement,
    );
    vi.useRealTimers();
  });

  it("traps keyboard focus between the two vault actions", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPortal(<VanguardLanding {...props} />);

    await user.click(
      screen.getByRole("button", { name: "Unlock authentication options" }),
    );
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    const signIn = screen.getByRole("link", { name: "Sign In" });
    const createAccount = screen.getByRole("link", {
      name: "Create Account",
    });
    expect(signIn).toBe(document.activeElement);

    await user.tab();
    expect(createAccount).toBe(document.activeElement);

    await user.tab();
    expect(signIn).toBe(document.activeElement);
    vi.useRealTimers();
  });

  it("dismisses the vault dialog with Escape and restores shield focus", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPortal(<VanguardLanding {...props} />);

    const shield = screen.getByRole("button", {
      name: "Unlock authentication options",
    });
    shield.focus();
    await user.keyboard("{Enter}");
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    const dialog = document.querySelector("dialog");
    expect(dialog).toHaveAttribute("open");

    await user.keyboard("{Escape}");

    expect(dialog).not.toHaveAttribute("open");
    expect(shield).toHaveAttribute("aria-expanded", "false");
    expect(shield).toBe(document.activeElement);
    vi.useRealTimers();
  });

  it("writes pointer and magic-trail CSS vars via rAF without React pointer state", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { container } = renderPortal(<VanguardLanding {...props} />);
    const landing = container.querySelector<HTMLElement>(".lynx-landing");
    expect(landing).not.toBeNull();

    fireEvent.pointerMove(landing!, {
      clientX: 180,
      clientY: 120,
      pointerType: "mouse",
    });

    await act(async () => {
      vi.advanceTimersByTime(32);
    });

    fireEvent.pointerMove(landing!, {
      clientX: 240,
      clientY: 150,
      pointerType: "mouse",
    });

    await act(async () => {
      vi.advanceTimersByTime(32);
    });

    expect(landing?.dataset.keyVisible).toBe("1");
    expect(landing?.style.getPropertyValue("--key-x")).not.toBe("");
    expect(landing?.style.getPropertyValue("--key-angle")).not.toBe("");
    expect(landing?.style.getPropertyValue("--trail-0-x")).not.toBe("");
    expect(landing?.style.getPropertyValue("--trail-0-opacity")).toBe("0.44");
    expect(landing?.style.getPropertyValue("--bead-0-life")).not.toBe("0");
    expect(landing?.style.getPropertyValue("--key-speed-scale")).not.toBe("");
    expect(landing?.dataset.phase).toMatch(/idle|tracking|magnetized|inserted/);
    vi.useRealTimers();
  });

  it("evolves the decorative keyblade layer during magnetic approach", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { container } = renderPortal(<VanguardLanding {...props} />);
    const landing = container.querySelector<HTMLElement>(".lynx-landing");
    const key = container.querySelector<HTMLElement>("[data-landing-key]");
    const evolution = container.querySelector<SVGGElement>(
      ".lynx-landing__keyblade-evolution",
    );

    expect(landing).not.toBeNull();
    expect(key).toHaveAttribute("aria-hidden", "true");
    expect(evolution).not.toBeNull();

    // Default test shield center is (0,0); 150px is inside attraction but
    // outside alignment/insertion, so the key remains a ceremonial keyblade.
    fireEvent.pointerMove(landing!, {
      clientX: 150,
      clientY: 0,
      pointerType: "mouse",
    });

    await act(async () => {
      vi.advanceTimersByTime(32);
    });

    expect(landing?.dataset.phase).toBe("magnetized");
    vi.useRealTimers();
  });

  it("enters the inserted phase when the key reaches the default hole", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { container } = renderPortal(<VanguardLanding {...props} />);
    const landing = container.querySelector<HTMLElement>(".lynx-landing");
    expect(landing).not.toBeNull();

    // Without measurements shieldCenter defaults to (0,0).
    fireEvent.pointerMove(landing!, {
      clientX: 0,
      clientY: 0,
      pointerType: "mouse",
    });

    await act(async () => {
      vi.advanceTimersByTime(32);
    });

    expect(landing?.dataset.phase).toMatch(/inserted|quaking|vaultOpening|vaultOpen/);
    vi.useRealTimers();
  });

  it("navigates Sign In with departing intent and locks double activation", async () => {
    push.mockClear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { container } = renderPortal(<VanguardLanding {...props} />);

    const shield = screen.getByRole("button", {
      name: "Unlock authentication options",
    });
    await user.click(shield);
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    const signIn = screen.getByRole("link", { name: "Sign In" });
    await user.click(signIn);
    await user.click(signIn);

    const landing = container.querySelector<HTMLElement>(".lynx-landing");
    expect(landing?.dataset.phase).toBe("departing");
    expect(landing?.dataset.intent).toBe("signin");

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith(props.signInHref);
    vi.useRealTimers();
  });

  it("cancels delayed navigation when the landing unmounts", async () => {
    push.mockClear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { unmount } = renderPortal(<VanguardLanding {...props} />);

    await user.click(
      screen.getByRole("button", { name: "Unlock authentication options" }),
    );
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    await user.click(screen.getByRole("link", { name: "Sign In" }));

    unmount();
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(push).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("navigates Create Account immediately under reduced motion", async () => {
    push.mockClear();
    const matchMedia = vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches: query.includes("prefers-reduced-motion"),
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as MediaQueryList,
    );

    const user = userEvent.setup();
    renderPortal(<VanguardLanding {...props} />);

    await user.click(
      screen.getByRole("button", { name: "Unlock authentication options" }),
    );

    await user.click(screen.getByRole("link", { name: "Create Account" }));

    expect(push).toHaveBeenCalledWith(props.signUpHref);
    matchMedia.mockRestore();
  });
});
