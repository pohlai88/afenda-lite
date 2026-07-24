import { ok } from "@afenda/errors/result";
import type { DomainEvent } from "@afenda/events";
import type { EmployeeListPage } from "@afenda/human-resources";
import type { Notification } from "@afenda/notifications";
import type { SearchDocument, SearchUpsertInput } from "@afenda/search";
import { describe, expect, it, vi } from "vitest";

import { handleHumanResourcesPlatformEvent } from "@/modules/platform/domain/human-resources-platform-events";
import { rebuildHumanResourcesEmployeeSearch } from "@/modules/platform/domain/human-resources-search-projection";

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
		if (existing !== undefined) return ok(existing);
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
		return ok(created);
	});
	return { entries, publish };
}

describe("Human Resources platform integrations", () => {
	it("delivers notification intent with an event deduplication key", async () => {
		const record = vi.fn(async (_input: unknown) =>
			ok({
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
		const result = await handleHumanResourcesPlatformEvent(
			hrEvent(),
			{ record },
			publisher,
		);

		expect(result.ok).toBe(true);
		expect(publisher.publish).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "platform.human-resources.reporting-fact.recorded.v1",
				deduplicationKey: "source-event:event-hr-1",
				organizationId: "org-1",
			}),
		);
		await handleHumanResourcesPlatformEvent(hrEvent(), { record }, publisher);
		expect(publisher.entries.size).toBe(1);
		expect(record).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: "org-1",
				userId: "employee-user-1",
				deduplicationKey: "event:event-hr-1",
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
		if (!result.ok) return;
		expect(result.data.platformEvents.map((entry) => entry.type)).toEqual([
			"identity.human-resources.lifecycle-fact.recorded.v1",
			"platform.human-resources.reporting-fact.recorded.v1",
		]);
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

		const result = await handleHumanResourcesPlatformEvent(
			source,
			{ record: vi.fn() },
			publisher,
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
		const publish = vi.fn(async () => ({
			ok: false as const,
			code: "INTERNAL_ERROR" as const,
			message: "platform unavailable",
		}));

		const result = await handleHumanResourcesPlatformEvent(
			hrEvent(),
			{ record },
			{ publish },
		);

		expect(result.ok).toBe(false);
		expect(record).not.toHaveBeenCalled();
	});
	it("builds permission-tagged employee search projections", async () => {
		const list = vi.fn(async () =>
			ok({
				employees: [
					{
						id: "00000000-0000-4000-8000-000000000001",
						organizationId: "org-1",
						employeeNumber: "E-001",
						legalName: "Ada Lovelace",
						version: 1,
						createdBy: "actor-1",
						updatedBy: "actor-1",
						createdAt: new Date(),
						updatedAt: new Date(),
					},
				],
				totalCount: 1,
				page: 1,
				pageSize: 100,
			} satisfies EmployeeListPage),
		);
		const upsert = vi.fn(async (rows: SearchUpsertInput[]) =>
			ok(
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

		const result = await rebuildHumanResourcesEmployeeSearch(
			{
				organizationId: "org-1",
				actorUserId: "actor-1",
				correlationId: "corr-1",
			},
			{ list, upsert },
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
	});

	it("fails closed when a list adapter returns another tenant", async () => {
		const list = vi.fn(async () =>
			ok({
				employees: [
					{
						id: "00000000-0000-4000-8000-000000000001",
						organizationId: "org-other",
						employeeNumber: "E-001",
						legalName: "Cross Tenant",
						version: 1,
						createdBy: "actor-1",
						updatedBy: "actor-1",
						createdAt: new Date(),
						updatedAt: new Date(),
					},
				],
				totalCount: 1,
				page: 1,
				pageSize: 100,
			} satisfies EmployeeListPage),
		);
		const upsert = vi.fn(async (_rows: SearchUpsertInput[]) =>
			ok([] as SearchDocument[]),
		);

		const result = await rebuildHumanResourcesEmployeeSearch(
			{
				organizationId: "org-1",
				actorUserId: "actor-1",
				correlationId: "corr-1",
			},
			{ list, upsert },
		);

		expect(result.ok).toBe(false);
		expect(upsert).not.toHaveBeenCalled();
	});
});
