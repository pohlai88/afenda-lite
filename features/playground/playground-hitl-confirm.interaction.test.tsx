import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";

import {
  PlaygroundHitlConfirm,
  PlaygroundHitlReviewsProvider,
} from "@/features/playground/playground-hitl-confirm";
import {
  PLAYGROUND_HITL_STORAGE_KEY,
  parsePlaygroundHitlReviews,
  readPlaygroundHitlReviews,
  writePlaygroundHitlReviews,
} from "@/features/playground/playground-hitl-rows";
import { getPlaygroundRouteReview } from "@/features/playground/playground-route-review";
import { renderPortal, setupUser } from "@/testing/react";

describe("PlaygroundHitlConfirm", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("falls back safely when browser storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Storage disabled", "SecurityError");
    });

    expect(readPlaygroundHitlReviews()).toEqual({});
  });

  it("does not crash when browser storage rejects a write", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage full", "QuotaExceededError");
    });

    expect(() => writePlaygroundHitlReviews({})).not.toThrow();
  });

  it("persists an explicit verdict and human note", async () => {
    const user = setupUser();
    renderPortal(
      <PlaygroundHitlReviewsProvider>
        <PlaygroundHitlConfirm
          screenId="dynamic-client-join"
          label="Join (invitation entry)"
          path="/join"
          pathConfigured
          shape="stub"
          review={getPlaygroundRouteReview("dynamic-client-join")}
          variant="compact"
        />
      </PlaygroundHitlReviewsProvider>,
    );

    const verdict = await screen.findByLabelText(
      "Human verdict for Join (invitation entry)",
    );
    await waitFor(() => expect(verdict).toBeEnabled());
    await user.click(verdict);
    await user.click(screen.getByRole("option", { name: "Needs repair" }));

    await user.click(screen.getByRole("button", { name: "Add note" }));
    await user.type(
      screen.getByLabelText("Human note"),
      "The registered route still renders the holding page.",
    );
    await user.click(screen.getByRole("button", { name: "Save note" }));

    await waitFor(() => {
      const reviews = parsePlaygroundHitlReviews(
        window.localStorage.getItem(PLAYGROUND_HITL_STORAGE_KEY),
      );
      expect(reviews["dynamic-client-join"]).toMatchObject({
        verdict: "needs-repair",
        note: "The registered route still renders the holding page.",
      });
    });
  });
});
