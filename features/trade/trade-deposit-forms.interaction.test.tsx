import { describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import { TradeDepositPanel } from "@/features/trade/trade-deposit-forms";
import { renderPortal, setupUser } from "@/testing/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/app/actions/trade", () => ({
  recordDepositAdjustmentAction: vi.fn(),
  recordDepositReceiptAction: vi.fn(async () => ({ ok: true })),
  updateDepositDetailsAction: vi.fn(),
}));

import { recordDepositReceiptAction } from "@/app/actions/trade";

const depositFixture = {
  id: "dep-1",
  orderId: "ord-1",
  orderNumber: "HS-100",
  customerName: "Acme",
  customerCode: null,
  orderDepositStatus: "pending" as const,
  amount: 500,
  currency: "USD",
  dueAt: null,
  nonRefundable: false,
  status: "pending",
  createdBy: "user-1",
  createdAt: new Date("2026-07-01T00:00:00.000Z"),
  updatedAt: new Date("2026-07-01T00:00:00.000Z"),
};

describe("TradeDepositPanel", () => {
  it("submits deposit receipt form", async () => {
    const user = setupUser();

    renderPortal(
      <TradeDepositPanel
        locale="en"
        eventId="evt-1"
        deposits={[depositFixture]}
        audit={[]}
        canManage
      />,
    );

    const receiptSection = screen.getByText("Record receipt").closest("form");
    expect(receiptSection).toBeTruthy();
    await user.type(within(receiptSection!).getByLabelText(/^Amount$/i), "250");
    await user.type(within(receiptSection!).getByLabelText(/^Reference$/i), "TX-1");
    await user.click(screen.getByRole("button", { name: /Save receipt/i }));

    await waitFor(() => {
      expect(recordDepositReceiptAction).toHaveBeenCalled();
    });
  });
});
