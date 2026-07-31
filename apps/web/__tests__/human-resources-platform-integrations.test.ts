import { errorResult } from "@afenda/errors";
import type { DomainEvent } from "@afenda/events";
import type { Employee, EmployeeListPage } from "@afenda/human-resources";
import type { HumanResourcesEmployeeId } from "@afenda/human-resources/brands";
import type { Notification } from "@afenda/notifications";
import type {
	SearchDocument,
	SearchHit,
	SearchUpsertInput,
} from "@afenda/search";
import { describe, expect, it, vi } from "vitest";

import {
	type HumanResourcesPersistedWorkItem,
	handleHumanResourcesPlatformEvent,
} from "@/modules/platform/domain/human-resources-platform-events";
import {
	rebuildHumanResourcesEmployeeSearch,
	searchHumanResourcesEmployees,
} from "@/modules/platform/domain/human-resources-search-projection";

const sampleEmployeeId =
	"00000000-0000-4000-8000-000000000001" as HumanResourcesEmployeeId;

function sampleEmployee(input: {
	organizationId: string;
	legalName?: string;
}): Employee {
	return {
		id: sampleEmployeeId,
		organizationId: input.organizationId,
		employeeNumber: "E-001",
		legalName: input.legalName ?? "Ada Lovelace",
		version: 1,
		createdBy: "actor-1",
		updatedBy: "actor-1",
		createdAt: new Date(),
		updatedAt: new Date(),
	};
}

function sampleEmployeeListPage(input: {
	organizationId: string;
	legalName?: string;
}): EmployeeListPage {
	return {
		employees: [sampleEmployee(input)],
		totalCount: 1,
		page: 1,
		pageSize: 100,
	};
}

function hrEvent(): DomainEvent {
	return {
		id: "event-hr-1",
		type: "human-resources.employee-document.nearing-expiry.v1",
		sourceModule: "human-resources",
		occurredAt: new Date("2026-07-24T00:00:00.000Z"),
		correlationId: "corr-1",
		causationId: null,
		organizationId: "org-1",
		actorUserId: "actor-1",
		payload: {
			organizationId: "org-1",
			entityType: "hr_employee_document",
			entityId: "document-1",
			actorId: "actor-1",
			correlationId: "corr-1",
			operation: "human-resources.employee-document.mark-nearing-expiry",
			idempotencyKey: "employee-document-nearing-expiry-1",
		},
		metadata: { recipientUserId: "employee-user-1" },
		status: "pending",
		attempts: 0,
		lastError: null,
		processedAt: null,
	};
}
function createFactPublisher() {
	const entries = new Map<string, DomainEvent>();
	let sequence = 0;
	const publish = vi.fn(async (input: unknown) => {
		const command = input as {
			type: string;
			sourceModule: DomainEvent["sourceModule"];
			deduplicationKey?: string;
			organizationId: string;
			actorUserId: string;
			correlationId: string;
			causationId?: string;
			payload: Record<string, unknown>;
			metadata?: Record<string, unknown>;
		};
		const key = [
			command.organizationId,
			command.sourceModule,
			command.type,
			command.deduplicationKey ?? "",
		].join(":");
		const existing = entries.get(key);
		if (existing !== undefined) {
			return await errorResult.ok(existing);
		}
		sequence += 1;
		const created: DomainEvent = {
			id: `derived-${sequence}`,
			type: command.type,
			sourceModule: command.sourceModule,
			deduplicationKey: command.deduplicationKey ?? null,
			occurredAt: new Date("2026-07-24T00:00:00.000Z"),
			correlationId: command.correlationId,
			causationId: command.causationId ?? null,
			organizationId: command.organizationId,
			actorUserId: command.actorUserId,
			payload: command.payload,
			metadata: command.metadata ?? null,
			status: "pending",
			attempts: 0,
			lastError: null,
			processedAt: null,
		};
		entries.set(key, created);
		return await errorResult.ok(created);
	});
	return { entries, publish };
}

function createWorkItemSink() {
	const entries = new Map<string, HumanResourcesPersistedWorkItem>();
	const record = vi.fn(
		async (input: {
			workItem: { organizationId: string; deduplicationKey: string };
			actorUserId: string;
		}) => {
			const key = `${input.workItem.organizationId}:${input.workItem.deduplicationKey}`;
			const existing = entries.get(key);
			if (existing !== undefined) {
				return await errorResult.ok(existing);
			}
			const created = {
				id: `work-item-${entries.size + 1}`,
				organizationId: input.workItem.organizationId,
				deduplicationKey: input.workItem.deduplicationKey,
			};
			entries.set(key, created);
			return await errorResult.ok(created);
		},
	);
	return { entries, record };
}

function createSuccessfulNotificationRecorder() {
	return {
		record: vi.fn(async () =>
			errorResult.ok({
				id: "notification-work-item",
				organizationId: "org-1",
				userId: "employee-user-1",
				type: "ACTION_REQUIRED",
				priority: "HIGH",
				channel: "IN_APP",
				title: "HR action",
				body: "Complete the HR action.",
				module: "human-resources",
				deduplicationKey: "event:event-hr-1",
				actionUrl: null,
				metadata: null,
				read: false,
				expiresAt: null,
				createdAt: new Date(),
			} satisfies Notification),
		),
	};
}

describe("Human Resources platform integrations", () => {
	it("delivers notification intent with an event deduplication key", async () => {
		const record = vi.fn(async (_input: unknown) =>
			errorResult.ok({
				id: "notification-1",
				organizationId: "org-1",
				userId: "employee-user-1",
				type: "ACTION_REQUIRED",
				priority: "HIGH",
				channel: "IN_APP",
				title: "Employee document nearing expiry",
				body: "Review the expiring employee document.",
				module: "human-resources",
				deduplicationKey: "event:event-hr-1",
				actionUrl: null,
				metadata: null,
				read: false,
				expiresAt: null,
				createdAt: new Date(),
			} satisfies Notification),
		);

		const publisher = createFactPublisher();
		const workItemSink = createWorkItemSink();
		const result = await handleHumanResourcesPlatformEvent(
			hrEvent(),
			{ record },
			publisher,
			workItemSink,
		);

		expect(result.ok).toBe(true);
		expect(publisher.publish).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "platform.human-resources.reporting-fact.recorded.v1",
				deduplicationKey: "source-event:event-hr-1",
				organizationId: "org-1",
			}),
		);
		await handleHumanResourcesPlatformEvent(
			hrEvent(),
			{ record },
			publisher,
			workItemSink,
		);
		expect(publisher.entries.size).toBe(1);
		expect(workItemSink.entries.size).toBe(1);
		expect(record).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: "org-1",
				userId: "employee-user-1",
				deduplicationKey: "event:event-hr-1",
			}),
		);
	});

	it("fails closed before publication when the durable work-item sink is absent", async () => {
		const notificationRecord = vi.fn();
		const publisher = createFactPublisher();

		const result = await handleHumanResourcesPlatformEvent(
			hrEvent(),
			{ record: notificationRecord },
			publisher,
			null,
		);

		expect(result).toMatchObject({
			ok: false,
			code: "SERVICE_UNAVAILABLE",
		});
		expect(publisher.publish).not.toHaveBeenCalled();
		expect(notificationRecord).not.toHaveBeenCalled();
	});

	it("fails closed when work-item persistence fails or returns mismatched evidence", async () => {
		const notificationRecord = vi.fn();
		const publisher = createFactPublisher();
		const unavailable = await handleHumanResourcesPlatformEvent(
			hrEvent(),
			{ record: notificationRecord },
			publisher,
			{
				record: async () => errorResult.fail("SERVICE_UNAVAILABLE"),
			},
		);
		expect(unavailable).toMatchObject({
			ok: false,
			code: "SERVICE_UNAVAILABLE",
		});
		expect(publisher.publish).not.toHaveBeenCalled();

		const mismatched = await handleHumanResourcesPlatformEvent(
			hrEvent(),
			{ record: notificationRecord },
			publisher,
			{
				record: async () =>
					errorResult.ok({
						id: "work-item-other",
						organizationId: "org-other",
						deduplicationKey: "wrong-key",
					}),
			},
		);
		expect(mismatched).toMatchObject({
			ok: false,
			code: "INTERNAL_ERROR",
		});
		expect(notificationRecord).not.toHaveBeenCalled();
	});

	it.each([
		["human-resources.leave.requested.v1", "approval"],
		["human-resources.onboarding.started.v1", "task"],
		["human-resources.employee-document.nearing-expiry.v1", "reminder"],
		["human-resources.employee-document.expired.v1", "escalation"],
	] as const)("persists projected %s work items as %s", async (type, kind) => {
		const source = hrEvent();
		source.type = type;
		const publisher = createFactPublisher();
		const workItemSink = createWorkItemSink();

		const result = await handleHumanResourcesPlatformEvent(
			source,
			createSuccessfulNotificationRecorder(),
			publisher,
			workItemSink,
		);

		expect(result.ok).toBe(true);
		expect(workItemSink.record).toHaveBeenCalledWith(
			expect.objectContaining({
				actorUserId: "actor-1",
				workItem: expect.objectContaining({
					kind,
					organizationId: "org-1",
					deduplicationKey: "event:event-hr-1:work-item",
				}),
			}),
		);
	});

	it("publishes replay-safe joiner facts through the identity boundary", async () => {
		const source = hrEvent();
		source.type = "human-resources.employment.started.v1";
		source.payload = {
			organizationId: "org-1",
			entityType: "hr_employment",
			entityId: "employment-1",
			actorId: "actor-1",
			correlationId: "corr-1",
			operation: "human-resources.employment.start",
			idempotencyKey: "employment-start-1",
		};
		source.metadata = null;
		const record = vi.fn();
		const publisher = createFactPublisher();

		const result = await handleHumanResourcesPlatformEvent(
			source,
			{ record },
			publisher,
		);

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.data.platformEvents.map((entry) => entry.type)).toEqual([
			"identity.human-resources.lifecycle-fact.recorded.v1",
			"platform.human-resources.reporting-fact.recorded.v1",
			"platform.human-resources.accounting-provisioning-fact.recorded.v1",
		]);
		expect(publisher.publish).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "platform.human-resources.accounting-provisioning-fact.recorded.v1",
				deduplicationKey: "event:event-hr-1:access-provisioning",
				payload: expect.objectContaining({
					kind: "access_provisioning",
					action: "grant",
					employeeEntityId: "employment-1",
				}),
			}),
		);
		expect(record).not.toHaveBeenCalled();
	});

	it("publishes workflow transition, policy snapshot, and outcome facts", async () => {
		const source = hrEvent();
		source.type = "human-resources.onboarding.started.v1";
		source.payload = {
			organizationId: "org-1",
			entityType: "hr_onboarding_case",
			entityId: "onboarding-1",
			actorId: "actor-1",
			correlationId: "corr-1",
			operation: "human-resources.onboarding.start",
			idempotencyKey: "onboarding-start-1",
		};
		source.metadata = null;
		const publisher = createFactPublisher();
		const workItemSink = createWorkItemSink();

		const result = await handleHumanResourcesPlatformEvent(
			source,
			{ record: vi.fn() },
			publisher,
			workItemSink,
		);

		expect(result.ok).toBe(true);
		expect(publisher.publish).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "platform.human-resources.workflow-fact.recorded.v1",
				payload: expect.objectContaining({
					outcome: "in_progress",
					policySnapshot: {
						operation: "human-resources.onboarding.start",
						idempotencyKey: "onboarding-start-1",
					},
				}),
			}),
		);
	});
	it("fails the handler so the outbox can retry when platform delivery fails", async () => {
		const record = vi.fn();
		const workItemSink = createWorkItemSink();
		const publish = vi.fn(async () => errorResult.fail("INTERNAL_ERROR"));

		const result = await handleHumanResourcesPlatformEvent(
			hrEvent(),
			{ record },
			{ publish },
			workItemSink,
		);

		expect(result.ok).toBe(false);
		expect(record).not.toHaveBeenCalled();
	});
	it("builds permission-tagged employee search projections", async () => {
		const list = vi.fn(async () =>
			errorResult.ok(sampleEmployeeListPage({ organizationId: "org-1" })),
		);
		const upsert = vi.fn(async (rows: SearchUpsertInput[]) =>
			errorResult.ok(
				rows.map(
					(row): SearchDocument => ({
						id: `search-${row.documentId}`,
						...row,
						description: row.description ?? null,
						url: row.url ?? null,
						metadata: row.metadata ?? null,
						createdAt: new Date(),
						updatedAt: new Date(),
					}),
				),
			),
		);
		const listIds = vi.fn(async () =>
			errorResult.ok([sampleEmployeeId, "stale-employee"]),
		);
		const deleteDocument = vi.fn(async () => errorResult.ok({ deleted: true }));

		const result = await rebuildHumanResourcesEmployeeSearch(
			{
				organizationId: "org-1",
				actorUserId: "actor-1",
				correlationId: "corr-1",
			},
			{ list, upsert, listIds, deleteDocument },
		);

		expect(result.ok).toBe(true);
		expect(upsert).toHaveBeenCalledWith([
			expect.objectContaining({
				organizationId: "org-1",
				entity: "human_resources_employee",
				title: "Ada Lovelace",
				metadata: expect.objectContaining({
					requiredPermission: "human-resources.employee.read",
					factVersion: 1,
				}),
			}),
		]);
		expect(deleteDocument).toHaveBeenCalledWith({
			organizationId: "org-1",
			entity: "human_resources_employee",
			documentId: "stale-employee",
		});
		if (result.ok) {
			expect(result.data.pruned).toBe(1);
		}
	});

	it("fails closed when a list adapter returns another tenant", async () => {
		const list = vi.fn(async () =>
			errorResult.ok(
				sampleEmployeeListPage({
					organizationId: "org-other",
					legalName: "Cross Tenant",
				}),
			),
		);
		const upsert = vi.fn(async (_rows: SearchUpsertInput[]) =>
			errorResult.ok([] as SearchDocument[]),
		);
		const listIds = vi.fn(async () => errorResult.ok([] as string[]));
		const deleteDocument = vi.fn(async () =>
			errorResult.ok({ deleted: false }),
		);

		const result = await rebuildHumanResourcesEmployeeSearch(
			{
				organizationId: "org-1",
				actorUserId: "actor-1",
				correlationId: "corr-1",
			},
			{ list, upsert, listIds, deleteDocument },
		);

		expect(result.ok).toBe(false);
		expect(upsert).not.toHaveBeenCalled();
		expect(listIds).not.toHaveBeenCalled();
	});

	it("authorizes employee search before issuing a tenant-bound query", async () => {
		const search = vi.fn(async () =>
			errorResult.ok([
				{
					id: "search-1",
					organizationId: "org-1",
					entity: "human_resources_employee",
					documentId: sampleEmployeeId,
					title: "Ada Lovelace",
					description: "E-001",
					url: null,
					metadata: {
						requiredPermission: "human-resources.employee.read",
						factVersion: 1,
					},
					score: 1,
				},
			] satisfies SearchHit[]),
		);
		const hasPermission = vi.fn(async () => true);

		const result = await searchHumanResourcesEmployees(
			{
				session: { orgId: "org-1", userId: "actor-1", role: "client" },
				query: "Ada",
				limit: 5,
			},
			{ hasPermission, search },
		);

		expect(result.ok).toBe(true);
		expect(search).toHaveBeenCalledWith({
			organizationId: "org-1",
			query: "Ada",
			entity: "human_resources_employee",
			limit: 5,
			offset: undefined,
		});
	});

	it("does not query employee search when permission is denied", async () => {
		const search = vi.fn(async () => errorResult.ok([] as SearchHit[]));

		const result = await searchHumanResourcesEmployees(
			{
				session: { orgId: "org-1", userId: "actor-1", role: "client" },
				query: "Ada",
			},
			{ hasPermission: async () => false, search },
		);

		expect(result.ok).toBe(false);
		expect(search).not.toHaveBeenCalled();
	});

	it("fails closed for cross-tenant or untagged employee search hits", async () => {
		const invalidHit: SearchHit = {
			id: "search-1",
			organizationId: "org-other",
			entity: "human_resources_employee",
			documentId: sampleEmployeeId,
			title: "Ada Lovelace",
			description: "E-001",
			url: null,
			metadata: null,
			score: 1,
		};

		const result = await searchHumanResourcesEmployees(
			{
				session: { orgId: "org-1", userId: "actor-1", role: "client" },
				query: "Ada",
			},
			{
				hasPermission: async () => true,
				search: async () => errorResult.ok([invalidHit]),
			},
		);

		expect(result.ok).toBe(false);
	});
});
