import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	runner: vi.fn(),
	replay: vi.fn(),
	checkpoint: vi.fn(),
	acknowledge: vi.fn(),
	audit: vi.fn(),
}));

vi.mock("@afenda/audit", () => ({
	createAuditRecorder: () => ({ record: mocks.audit }),
}));
vi.mock("@/app/actions/run-hr-operator-permission-action", () => ({
	runHrIntegrationOperatorPermissionAction: mocks.runner,
}));
vi.mock("@/modules/platform/domain/human-resources-reliability-worker", () => ({
	replayProductionReliabilityDeadLetter: mocks.replay,
	checkpointProductionConnectorCursor: mocks.checkpoint,
	acknowledgeProductionReliabilityWork: mocks.acknowledge,
}));

import {
	acknowledgeHumanResourcesReliabilityWorkAction,
	repairHumanResourcesConnectorCursorAction,
	replayHumanResourcesReliabilityDeadLetterAction,
} from "@/app/actions/hr-reliability";

const session = { orgId: "org-1", userId: "operator-1", role: "operator" };

describe("HR reliability operator Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.runner.mockImplementation((input) =>
			input.execute(session, "correlation-1"),
		);
		mocks.audit.mockResolvedValue({ ok: true, data: { id: "audit-1" } });
		mocks.replay.mockResolvedValue({
			ok: true,
			data: { id: "work-1", status: "pending" },
		});
		mocks.checkpoint.mockResolvedValue({
			ok: true,
			data: { version: 2 },
		});
		mocks.acknowledge.mockResolvedValue({
			ok: true,
			data: { status: "succeeded" },
		});
	});

	it("requires reliability permission and writes an audit fact for replay", async () => {
		const result = await replayHumanResourcesReliabilityDeadLetterAction({
			deadLetterId: "12f55fbe-3762-4d25-a59d-e5d9d3a9ce61",
		});
		expect(result).toMatchObject({ ok: true });
		expect(mocks.runner).toHaveBeenCalledWith(
			expect.objectContaining({
				permission: "human-resources.reliability.operate",
			}),
		);
		expect(mocks.audit).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: "org-1",
				actorUserId: "operator-1",
				action: "REPLAY",
			}),
		);
	});

	it("requires cursor permission and preserves compare-and-swap version", async () => {
		await repairHumanResourcesConnectorCursorAction({
			connector: "attendance",
			stream: "events",
			cursor: "cursor-2",
			expectedVersion: 1,
		});
		expect(mocks.runner).toHaveBeenCalledWith(
			expect.objectContaining({
				permission: "human-resources.connector-cursor.manage",
			}),
		);
		expect(mocks.checkpoint).toHaveBeenCalledWith(
			expect.objectContaining({ expectedVersion: 1 }),
		);
	});

	it("passes receipt and accepted row version to acknowledgement", async () => {
		await acknowledgeHumanResourcesReliabilityWorkAction({
			workItemId: "12f55fbe-3762-4d25-a59d-e5d9d3a9ce61",
			receiptId: "connector-receipt-1",
			expectedVersion: 3,
			outcome: "acknowledged",
		});
		expect(mocks.acknowledge).toHaveBeenCalledWith({
			organizationId: "org-1",
			workItemId: "12f55fbe-3762-4d25-a59d-e5d9d3a9ce61",
			receiptId: "connector-receipt-1",
			expectedVersion: 3,
			outcome: "acknowledged",
		});
	});
});
