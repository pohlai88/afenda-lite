import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { TradeErpSyncPanel } from "@/features/trade/trade-erp-sync-panel";
import type { HotSalesSyncJobDetailDto } from "@/lib/domain/trade/erp/types";
import { renderPortal, setupUser } from "@/testing/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/app/actions/trade", () => ({
  processErpSyncJobsAction: vi.fn(async () => ({ ok: true, processed: 0, succeeded: 0 })),
  retryErpSyncJobAction: vi.fn(async () => ({ ok: true })),
}));

import { retryErpSyncJobAction } from "@/app/actions/trade";

const failedJob: HotSalesSyncJobDetailDto = {
  id: "job-1",
  jobType: "order",
  entityId: "ord-1",
  idempotencyKey: "sync:order:ord-1:v1",
  status: "failed",
  attemptCount: 2,
  scheduledAt: "2026-07-10T08:00:00.000Z",
  lastError: "network_error",
  createdAt: "2026-07-10T07:00:00.000Z",
  updatedAt: "2026-07-10T08:00:00.000Z",
  attempts: [
    {
      id: "att-1",
      jobId: "job-1",
      attemptNo: 1,
      status: "failed",
      startedAt: "2026-07-10T07:30:00.000Z",
      finishedAt: "2026-07-10T07:31:00.000Z",
      errors: [
        {
          id: "err-1",
          attemptId: "att-1",
          code: "network_error",
          message: "timeout",
          retryable: true,
          createdAt: "2026-07-10T07:31:00.000Z",
        },
      ],
    },
  ],
};

describe("TradeErpSyncPanel", () => {
  it("expands DLQ detail and retries failed job", async () => {
    const user = setupUser();

    renderPortal(<TradeErpSyncPanel locale="en" jobs={[failedJob]} />);

    expect(screen.getByText(/DLQ \(failed\/dead\): 1/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "▶" }));

    await waitFor(() => {
      expect(screen.getByText(/\[network_error\] timeout/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^Retry$/i }));

    await waitFor(() => {
      expect(retryErpSyncJobAction).toHaveBeenCalledWith("en", "job-1");
    });
  });
});
