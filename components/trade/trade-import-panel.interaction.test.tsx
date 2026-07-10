import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { TradeImportPanel } from "@/components/trade/trade-import-panel";
import { renderPortal, setupUser } from "@/testing/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/app/actions/trade", () => ({
  cancelImportBatchAction: vi.fn(),
  confirmImportBatchAction: vi.fn(async () => ({
    ok: true,
    committedCount: 2,
    skippedCount: 0,
  })),
  getImportTemplateAction: vi.fn(),
  uploadImportDryRunAction: vi.fn(async () => ({
    batchId: "batch-1",
    rowCount: 2,
    validCount: 2,
    errorCount: 0,
    rows: [],
  })),
}));

import {
  confirmImportBatchAction,
  uploadImportDryRunAction,
} from "@/app/actions/trade";

describe("TradeImportPanel", () => {
  it("runs dry-run then confirm import", async () => {
    const user = setupUser();

    renderPortal(
      <TradeImportPanel
        locale="en"
        eventId="evt-1"
        depositEnabled
        pickupEnabled
      />,
    );

    const file = new File(["xlsx"], "import.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const input = screen.getByLabelText(/Excel file/i);
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      expect(uploadImportDryRunAction).toHaveBeenCalled();
    });

    await user.click(
      screen.getByRole("button", { name: /Confirm import \(2 rows\)/i }),
    );

    await waitFor(() => {
      expect(confirmImportBatchAction).toHaveBeenCalledWith(
        "en",
        "evt-1",
        "batch-1",
      );
    });
  });
});
