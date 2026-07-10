import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { TradePickupPanel } from "@/components/trade/trade-pickup-forms";
import { renderPortal, setupUser } from "@/testing/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/app/actions/trade", () => ({
  createPickupWindowAction: vi.fn(async () => ({ ok: true })),
  recordPickupExceptionAction: vi.fn(),
  recordPickupFulfillmentAction: vi.fn(),
  schedulePickupAction: vi.fn(),
}));

import { createPickupWindowAction } from "@/app/actions/trade";

describe("TradePickupPanel", () => {
  it("submits pickup window form", async () => {
    const user = setupUser();

    renderPortal(
      <TradePickupPanel
        locale="en"
        eventId="evt-1"
        windows={[]}
        queue={[]}
        canManage
      />,
    );

    await user.type(screen.getByLabelText(/^Starts$/i), "2026-07-10T09:00");
    await user.type(screen.getByLabelText(/^Ends$/i), "2026-07-10T17:00");
    await user.type(screen.getByLabelText(/^Location$/i), "Warehouse A");
    await user.click(screen.getByRole("button", { name: /Add window/i }));

    await waitFor(() => {
      expect(createPickupWindowAction).toHaveBeenCalled();
    });
  });
});
