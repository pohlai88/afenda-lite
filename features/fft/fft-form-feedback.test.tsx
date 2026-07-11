import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  TradeEmptyState,
  TradeFormError,
  TradeFormPending,
  TradePageSkeleton,
} from "@/features/fft/fft-form-feedback";

describe("trade-form-feedback (P2-AC-04)", () => {
  it("renders error with alert role when message set", () => {
    const html = renderToStaticMarkup(
      <TradeFormError message="reason_required" testId="trade-priority-error" />,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain("reason_required");
    expect(html).toContain('data-testid="trade-priority-error"');
  });

  it("renders nothing for empty error", () => {
    const html = renderToStaticMarkup(<TradeFormError message={null} />);
    expect(html).toBe("");
  });

  it("renders pending hint when pending", () => {
    const html = renderToStaticMarkup(
      <TradeFormPending pending label="Importing…" />,
    );
    expect(html).toContain("Importing…");
    expect(html).toContain('data-testid="trade-form-pending"');
  });

  it("renders empty state copy", () => {
    const html = renderToStaticMarkup(
      <TradeEmptyState
        title="No products yet"
        description="Add supply below."
        testId="trade-products-empty"
      />,
    );
    expect(html).toContain("No products yet");
    expect(html).toContain('data-testid="trade-products-empty"');
  });

  it("renders page skeleton", () => {
    const html = renderToStaticMarkup(<TradePageSkeleton rows={2} />);
    expect(html).toContain('data-testid="trade-page-skeleton"');
    expect(html).toContain('aria-busy="true"');
  });
});
