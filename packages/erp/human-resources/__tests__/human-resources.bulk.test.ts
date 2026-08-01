import {
	type BulkImportPorts,
	type BulkImportRequest,
	runHumanResourcesBulkImport,
} from "@afenda/human-resources";
import { createMemoryBulkCheckpointPort } from "@afenda/human-resources/testing";
import { describe, expect, it, vi } from "vitest";

interface Row {
	value: string;
}
interface Output {
	id: string;
}

function request(
	overrides: Partial<BulkImportRequest<Row>> = {},
): BulkImportRequest<Row> {
	return {
		organizationId: "org-bulk",
		actorUserId: "actor-bulk",
		correlationId: "corr-bulk",
		batchId: "batch-1",
		entityType: "employee",
		mode: "commit",
		idempotencyKey: "bulk-1",
		rows: [
			{ sourceReference: "row-1", payload: { value: "one" } },
			{ sourceReference: "row-2", payload: { value: "two" } },
		],
		...overrides,
	};
}

function ports(
	overrides: Partial<BulkImportPorts<Row, Row, Output>> = {},
): BulkImportPorts<Row, Row, Output> {
	return {
		checkpoints: createMemoryBulkCheckpointPort<Output>(),
		validate: vi.fn(async ({ row }) => ({ valid: true, value: row.payload })),
		execute: vi.fn(async ({ sourceReference }) => ({
			status: "applied",
			output: { id: sourceReference },
		})),
		...overrides,
	};
}

describe("Human Resources generic bulk kernel", () => {
	it("performs a dry run with line errors and no writes", async () => {
		const execute = vi.fn(async () => ({ status: "applied" as const }));
		const dependencies = ports({
			execute,
			validate: vi.fn(async ({ rowIndex, row }) =>
				rowIndex === 1
					? {
							valid: false as const,
							issues: [
								{
									code: "INVALID_VALUE",
									message: "Value is invalid",
									field: "value",
								},
							],
						}
					: { valid: true as const, value: row.payload },
			),
		});

		const result = await runHumanResourcesBulkImport(
			request({ mode: "dry_run" }),
			dependencies,
		);

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.data.status).toBe("dry_run_completed");
		expect(result.data.totals).toEqual({
			accepted: 1,
			rejected: 1,
			pending: 0,
		});
		expect(result.data.errorFile).toContain("INVALID_VALUE");
		expect(execute).not.toHaveBeenCalled();
	});

	it("reports duplicate source references as line-level rejections", async () => {
		const result = await runHumanResourcesBulkImport(
			request({
				mode: "dry_run",
				rows: [
					{ sourceReference: "duplicate", payload: { value: "one" } },
					{ sourceReference: "duplicate", payload: { value: "two" } },
				],
			}),
			ports(),
		);

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.data.rows[1]).toMatchObject({
			status: "rejected",
			issues: [{ code: "DUPLICATE_SOURCE_REFERENCE" }],
		});
	});

	it("continues after terminal line failures and emits deterministic row keys", async () => {
		const execute = vi.fn(async ({ rowIndex, rowIdempotencyKey }) =>
			rowIndex === 0
				? {
						status: "terminal_failure" as const,
						issues: [{ code: "DUPLICATE", message: "Employee exists" }],
					}
				: {
						status: "applied" as const,
						output: { id: rowIdempotencyKey },
					},
		);
		const result = await runHumanResourcesBulkImport(
			request(),
			ports({ execute }),
		);

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.data.status).toBe("completed_with_rejections");
		expect(result.data.rows.map((row) => row.status)).toEqual([
			"rejected",
			"accepted",
		]);
		expect(execute).toHaveBeenLastCalledWith(
			expect.objectContaining({ rowIdempotencyKey: "bulk-1:row-2" }),
		);
	});

	it("checkpoints bounded work, resumes, and replays a completed batch idempotently", async () => {
		const dependencies = ports();
		const first = await runHumanResourcesBulkImport(
			request({ maxRowsPerRun: 1 }),
			dependencies,
		);
		expect(first.ok).toBe(true);
		if (!first.ok) {
			return;
		}
		expect(first.data).toMatchObject({
			status: "checkpointed",
			nextRowIndex: 1,
			totals: { accepted: 1, rejected: 0, pending: 1 },
		});

		const resumed = await runHumanResourcesBulkImport(
			request({
				maxRowsPerRun: 1,
				expectedCheckpointVersion: first.data.checkpointVersion ?? undefined,
			}),
			dependencies,
		);
		expect(resumed.ok).toBe(true);
		if (!resumed.ok) {
			return;
		}
		expect(resumed.data.status).toBe("completed");
		expect(dependencies.execute).toHaveBeenCalledTimes(2);
		const checkpoint = await dependencies.checkpoints.load({
			organizationId: "org-bulk",
			idempotencyKey: "bulk-1",
		});
		expect(checkpoint.ok).toBe(true);
		if (!checkpoint.ok || checkpoint.data === null) {
			return;
		}
		expect(checkpoint.data.auditTrail.map((entry) => entry.event)).toEqual([
			"BATCH_STARTED",
			"ROW_ACCEPTED",
			"BATCH_CHECKPOINTED",
			"ROW_ACCEPTED",
			"BATCH_COMPLETED",
		]);

		const replay = await runHumanResourcesBulkImport(
			request({ maxRowsPerRun: 1 }),
			dependencies,
		);
		expect(replay).toEqual(resumed);
		expect(dependencies.execute).toHaveBeenCalledTimes(2);
	});

	it("pauses on retryable failure and retries the same row on resume", async () => {
		let attempts = 0;
		const dependencies = ports({
			execute: vi.fn(async ({ sourceReference }) => {
				attempts += 1;
				if (attempts === 1) {
					return await {
						status: "retryable_failure" as const,
						issue: { code: "RATE_LIMITED", message: "Try later" },
					};
				}
				return await {
					status: "applied" as const,
					output: { id: sourceReference },
				};
			}),
		});
		const first = await runHumanResourcesBulkImport(request(), dependencies);
		expect(first.ok).toBe(true);
		if (!first.ok) {
			return;
		}
		expect(first.data).toMatchObject({
			status: "retryable_failed",
			nextRowIndex: 0,
			retryableFailure: { disposition: "retryable", rowIndex: 0 },
		});

		const resumed = await runHumanResourcesBulkImport(
			request({
				expectedCheckpointVersion: first.data.checkpointVersion ?? undefined,
			}),
			dependencies,
		);
		expect(resumed.ok).toBe(true);
		if (!resumed.ok) {
			return;
		}
		expect(resumed.data.status).toBe("completed");
		expect(resumed.data.nextRowIndex).toBe(2);
	});

	it("rejects oversized batches, stale resumes, and changed idempotent payloads", async () => {
		const dependencies = ports();
		const oversized = await runHumanResourcesBulkImport(
			request({
				rows: Array.from({ length: 501 }, (_, index) => ({
					sourceReference: `row-${index}`,
					payload: { value: `${index}` },
				})),
			}),
			dependencies,
		);
		expect(oversized).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });

		const first = await runHumanResourcesBulkImport(
			request({ maxRowsPerRun: 1 }),
			dependencies,
		);
		expect(first.ok).toBe(true);
		const stale = await runHumanResourcesBulkImport(
			request({ maxRowsPerRun: 1, expectedCheckpointVersion: 999 }),
			dependencies,
		);
		expect(stale).toMatchObject({ ok: false, code: "CONFLICT" });
		const changed = await runHumanResourcesBulkImport(
			request({
				rows: [{ sourceReference: "row-1", payload: { value: "changed" } }],
			}),
			dependencies,
		);
		expect(changed).toMatchObject({ ok: false, code: "CONFLICT" });
	});
});
