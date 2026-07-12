/**
 * P3 ERP retry gate — F-OPS-ERP-02 / F-OPS-ERP-03 / AC-OPS-01.
 * Flag assert + sync.retry permission must both apply; flag-off blocks mutation and audit.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isFftErpSyncEnabled: vi.fn(),
  requireFftPermission: vi.fn(),
  getSyncJobById: vi.fn(),
  retrySyncJob: vi.fn(),
  recordFftAudit: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/modules/platform/env/accessors", () => ({
  isFftErpSyncEnabled: mocks.isFftErpSyncEnabled,
  isFftDepositEnabled: vi.fn(() => false),
  isFftPickupOpsEnabled: vi.fn(() => false),
}));

vi.mock("@/modules/fft/auth/fft-session", () => ({
  requireFftPermission: mocks.requireFftPermission,
  requireFftAdmin: vi.fn(),
}));

vi.mock("@/modules/platform/db", () => ({
  pool: { query: vi.fn(async () => ({ rows: [] })) },
}));

vi.mock("@/modules/fft/domain/erp-sync-store", () => ({
  enqueueErpSyncJob: vi.fn(),
  getSyncJobById: mocks.getSyncJobById,
  retrySyncJob: mocks.retrySyncJob,
  processPendingSyncJobs: vi.fn(),
  listSyncJobs: vi.fn(),
  listSyncJobDetails: vi.fn(),
  buildSyncIdempotencyKey: vi.fn(),
}));

vi.mock("@/modules/fft/domain/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/fft/domain/store")>();
  return {
    ...actual,
    recordFftAudit: mocks.recordFftAudit,
  };
});

import { retryErpSyncJobAction } from "@/app/actions/fft";

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
    mocks.requireFftPermission.mockResolvedValue({
      userId: "user-1",
      isAdmin: false,
    });
    mocks.recordFftAudit.mockResolvedValue(undefined);
  });

  it("returns erp_sync_disabled and skips permission, mutation, and audit when flag is off", async () => {
    mocks.isFftErpSyncEnabled.mockReturnValue(false);

    const result = await retryErpSyncJobAction("en", "job-1");

    expect(result).toEqual({ error: "erp_sync_disabled" });
    expect(mocks.requireFftPermission).not.toHaveBeenCalled();
    expect(mocks.getSyncJobById).not.toHaveBeenCalled();
    expect(mocks.retrySyncJob).not.toHaveBeenCalled();
    expect(mocks.recordFftAudit).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("retries failed job, audits, and keeps sync.retry when flag is on", async () => {
    mocks.isFftErpSyncEnabled.mockReturnValue(true);
    mocks.getSyncJobById.mockResolvedValue(failedJob);
    mocks.retrySyncJob.mockResolvedValue(pendingJob);

    const result = await retryErpSyncJobAction("en", "job-1");

    expect(result).toEqual({ ok: true });
    expect(mocks.requireFftPermission).toHaveBeenCalledWith("sync.retry");
    expect(mocks.retrySyncJob).toHaveBeenCalledWith("job-1");
    expect(mocks.recordFftAudit).toHaveBeenCalledWith(
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
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/fft/admin/erp-sync");
  });
});
