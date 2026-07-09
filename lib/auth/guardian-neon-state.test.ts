/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import {
  classifyNeonFeedbackMessage,
  collectNeonAccessPanelSignals,
  inferGuardianStateFromNeonSignals,
  mergeNeonFeedbackKinds,
  type NeonAccessPanelSignals,
} from "./guardian-neon-state";

describe("guardian-neon-state", () => {
  it("maps Neon feedback severity to GuardianState", () => {
    const base: NeonAccessPanelSignals = {
      sessionPending: false,
      neonMounted: true,
      formLoading: false,
      hasFocusedField: false,
      feedbackKind: null,
    };

    expect(inferGuardianStateFromNeonSignals({ ...base, formLoading: true })).toBe(
      "loading",
    );
    expect(
      inferGuardianStateFromNeonSignals({ ...base, feedbackKind: "success" }),
    ).toBe("success");
    expect(
      inferGuardianStateFromNeonSignals({ ...base, feedbackKind: "locked" }),
    ).toBe("locked");
    expect(
      inferGuardianStateFromNeonSignals({ ...base, feedbackKind: "warning" }),
    ).toBe("warning");
    expect(
      inferGuardianStateFromNeonSignals({ ...base, feedbackKind: "error" }),
    ).toBe("error");
    expect(
      inferGuardianStateFromNeonSignals({ ...base, hasFocusedField: true }),
    ).toBe("typing");
    expect(inferGuardianStateFromNeonSignals(base)).toBe("idle");
  });

  it("classifies lockout and warning copy", () => {
    expect(classifyNeonFeedbackMessage("Account locked")).toBe("locked");
    expect(classifyNeonFeedbackMessage("Too many attempts")).toBe("locked");
    expect(classifyNeonFeedbackMessage("Please verify your email")).toBe(
      "warning",
    );
    expect(classifyNeonFeedbackMessage("Invalid email or password")).toBe(
      "error",
    );
  });

  it("prefers locked over warning and error when multiple messages exist", () => {
    expect(mergeNeonFeedbackKinds(["error", "warning", "locked"])).toBe(
      "locked",
    );
    expect(mergeNeonFeedbackKinds(["error", "success"])).toBe("success");
  });

  it("detects loading when Neon submit controls are disabled together", () => {
    document.body.innerHTML = `
      <div id="panel">
        <div class="portal-neon-view">
          <form class="bg-card">
            <input name="email" disabled />
            <input name="password" disabled />
            <button type="submit" disabled><svg /></button>
          </form>
        </div>
      </div>
    `;

    const panel = document.getElementById("panel");
    expect(panel).toBeTruthy();

    const signals = collectNeonAccessPanelSignals(panel!);
    expect(signals.formLoading).toBe(true);
    expect(inferGuardianStateFromNeonSignals(signals)).toBe("loading");
  });

  it("detects typing when an access field is focused", () => {
    document.body.innerHTML = `
      <div id="panel">
        <div class="portal-neon-view">
          <form class="bg-card">
            <input id="email" name="email" />
          </form>
        </div>
      </div>
    `;

    const panel = document.getElementById("panel")!;
    const email = document.getElementById("email") as HTMLInputElement;
    email.focus();

    const signals = collectNeonAccessPanelSignals(panel);
    expect(signals.hasFocusedField).toBe(true);
    expect(inferGuardianStateFromNeonSignals(signals)).toBe("typing");
  });
});
