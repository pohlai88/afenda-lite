/**
 * P3 ERP retry gate — F-OPS-ERP-02 / F-OPS-ERP-03 / AC-OPS-01.
 * Flag assert + sync.retry permission must both apply; flag-off blocks mutation and audit.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isHotSalesErpSyncEnabled: vi.fn(),
  requireTradePermission: vi.fn(),
  getSyncJobById: vi.fn(),
  retrySyncJob: vi.fn(),
  recordHotSalesAudit: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/modules/platform/env/accessors", () => ({
  isHotSalesErpSyncEnabled: mocks.isHotSalesErpSyncEnabled,
  isHotSalesDepositEnabled: vi.fn(() => false),
  isHotSalesPickupOpsEnabled: vi.fn(() => false),
}));

vi.mock("@/modules/trade/auth/trade-session", () => ({
  requireTradePermission: mocks.requireTradePermission,
  requireTradeAdmin: vi.fn(),
}));

vi.mock("@/modules/platform/db", () => ({
  pool: { query: vi.fn(async () => ({ rows: [] })) },
}));

vi.mock("@/modules/trade/domain/erp-sync-store", () => ({
  enqueueErpSyncJob: vi.fn(),
  getSyncJobById: mocks.getSyncJobById,
  retrySyncJob: mocks.retrySyncJob,
  processPendingSyncJobs: vi.fn(),
  listSyncJobs: vi.fn(),
  listSyncJobDetails: vi.fn(),
  buildSyncIdempotencyKey: vi.fn(),
}));

vi.mock("@/modules/trade/domain/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/trade/domain/store")>();
  return {
    ...actual,
    recordHotSalesAudit: mocks.recordHotSalesAudit,
  };
});

import { retryErpSyncJobAction } from "@/app/actions/trade";

const failedJob = {
  id: "job-1",
  jobType: "order" as const,
  entityId: "ord-1",
  idempotencyKey: "sync:order:ord-1:v1",
  status: "failed" as const,
  attemptCount: 3,
  scheduledAt: new Date("2026-07-11T10:00:00.000Z"),
  lastError: "timeout",
  createdAt: new Date("2026-07-11T09:00:00.000Z"),
  updatedAt: new Date("2026-07-11T10:00:00.000Z"),
};

const pendingJob = {
  ...failedJob,
  status: "pending" as const,
  lastError: null,
  attemptCount: 3,
};

describe("retryErpSyncJobAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireTradePermission.mockResolvedValue({
      userId: "user-1",
      isAdmin: false,
    });
    mocks.recordHotSalesAudit.mockResolvedValue(undefined);
  });

  it("returns erp_sync_disabled and skips permission, mutation, and audit when flag is off", async () => {
    mocks.isHotSalesErpSyncEnabled.mockReturnValue(false);

    const result = await retryErpSyncJobAction("en", "job-1");

    expect(result).toEqual({ error: "erp_sync_disabled" });
    expect(mocks.requireTradePermission).not.toHaveBeenCalled();
    expect(mocks.getSyncJobById).not.toHaveBeenCalled();
    expect(mocks.retrySyncJob).not.toHaveBeenCalled();
    expect(mocks.recordHotSalesAudit).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("retries failed job, audits, and keeps sync.retry when flag is on", async () => {
    mocks.isHotSalesErpSyncEnabled.mockReturnValue(true);
    mocks.getSyncJobById.mockResolvedValue(failedJob);
    mocks.retrySyncJob.mockResolvedValue(pendingJob);

    const result = await retryErpSyncJobAction("en", "job-1");

    expect(result).toEqual({ ok: true });
    expect(mocks.requireTradePermission).toHaveBeenCalledWith("sync.retry");
    expect(mocks.retrySyncJob).toHaveBeenCalledWith("job-1");
    expect(mocks.recordHotSalesAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "erp_sync.retry",
        actorId: "user-1",
        reason: "manual_dlq_retry",
        oldValue: expect.objectContaining({
          jobId: "job-1",
          status: "failed",
        }),
        newValue: expect.objectContaining({
          jobId: "job-1",
          status: "pending",
        }),
      }),
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/trade/admin/erp-sync");
  });
});
