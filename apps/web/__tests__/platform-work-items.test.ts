// biome-ignore-all lint/performance/noAwaitInLoops: Cases run serially to isolate mutable test state and ordered transitions.
import { randomUUID } from "node:crypto";

import {
	database as afendaDatabase,
	and,
	eq,
	platformWorkItem,
	platformWorkItemActivity,
} from "@afenda/db";
import { testingDatabase } from "@afenda/testing";
import { afterAll, describe, expect, it } from "vitest";
import { createProductionHumanResourcesWorkItemSink } from "@/modules/platform/domain/human-resources-platform-events";
import {
	createDrizzlePlatformWorkItemStore,
	createMemoryPlatformWorkItemStore,
	type PlatformWorkItemKind,
	type PlatformWorkItemStatus,
	type PlatformWorkItemStore,
	type RecordPlatformWorkItemInput,
} from "@/modules/platform/domain/platform-work-items";

const { hasDatabase } = testingDatabase.resolve();
const databaseOrganizations = new Set<string>();

function input(
	organizationId: string,
	kind: PlatformWorkItemKind,
	suffix: string = kind,
): RecordPlatformWorkItemInput {
	return {
		organizationId,
		kind,
		targetUserId: "user-1",
		entityType: "hr_employee",
		entityId: `employee-${suffix}`,
		title: `Resolve ${suffix}`,
		priority: kind === "escalation" ? "HIGH" : "MEDIUM",
		dueOn: "2026-08-01",
		sourceEventId: `event-${suffix}`,
		deduplicationKey: `event:event-${suffix}:work-item`,
		factVersion: 1,
		correlationId: `correlation-${suffix}`,
		actorUserId: "actor-1",
	};
}

async function expectLifecycle(
	store: PlatformWorkItemStore,
	organizationId: string,
	kind: PlatformWorkItemKind,
	toStatus: PlatformWorkItemStatus,
): Promise<void> {
	const recorded = await store.record(input(organizationId, kind));
	// biome-ignore lint/suspicious/noMisplacedAssertion: Shared contract helper is invoked only by test cases.
	expect(recorded.ok).toBe(true);
	if (!recorded.ok) {
		return;
	}

	const replay = await store.record(input(organizationId, kind));
	// biome-ignore lint/suspicious/noMisplacedAssertion: Shared contract helper is invoked only by test cases.
	expect(replay).toEqual(recorded);

	const otherTenant = await store.find({
		organizationId: "another-organization",
		workItemId: recorded.data.id,
	});
	// biome-ignore lint/suspicious/noMisplacedAssertion: Shared contract helper is invoked only by test cases.
	expect(otherTenant).toEqual({ ok: true, data: null });

	const transitioned = await store.transition({
		organizationId,
		workItemId: recorded.data.id,
		expectedVersion: 1,
		toStatus,
		actorUserId: "actor-2",
		correlationId: `transition-${kind}`,
		reason: "Reviewed",
	});
	// biome-ignore lint/suspicious/noMisplacedAssertion: Shared contract helper is invoked only by test cases.
	expect(transitioned).toMatchObject({
		ok: true,
		data: { status: toStatus, version: 2, updatedBy: "actor-2" },
	});

	const stale = await store.transition({
		organizationId,
		workItemId: recorded.data.id,
		expectedVersion: 1,
		toStatus,
		actorUserId: "actor-3",
		correlationId: `stale-${kind}`,
	});
	// biome-ignore lint/suspicious/noMisplacedAssertion: Shared contract helper is invoked only by test cases.
	expect(stale).toMatchObject({ ok: false, code: "CONFLICT" });

	const activity = await store.listActivity({
		organizationId,
		workItemId: recorded.data.id,
	});
	// biome-ignore lint/suspicious/noMisplacedAssertion: Shared contract helper is invoked only by test cases.
	expect(activity).toMatchObject({
		ok: true,
		data: [
			{ action: "recorded", resultingVersion: 1, toStatus: "pending" },
			{
				action: "transitioned",
				resultingVersion: 2,
				fromStatus: "pending",
				toStatus,
			},
		],
	});
}

describe("platform work-item owner", () => {
	it.each([
		["approval", "approved"],
		["task", "completed"],
		["reminder", "dismissed"],
		["escalation", "in_progress"],
	] as const)("owns the %s lifecycle with CAS and immutable activity", async (kind, status) => {
		await expectLifecycle(
			createMemoryPlatformWorkItemStore(),
			`memory-${kind}`,
			kind,
			status,
		);
	});

	it("rejects incompatible deduplication replay and lifecycle transitions", async () => {
		const store = createMemoryPlatformWorkItemStore();
		const original = input("memory-conflict", "approval");
		const recorded = await store.record(original);
		expect(recorded.ok).toBe(true);
		if (!recorded.ok) {
			return;
		}

		expect(
			await store.record({ ...original, title: "Different command" }),
		).toMatchObject({
			ok: false,
			code: "CONFLICT",
		});
		expect(
			await store.transition({
				organizationId: original.organizationId,
				workItemId: recorded.data.id,
				expectedVersion: 1,
				toStatus: "completed",
				actorUserId: "actor-2",
				correlationId: "invalid-transition",
			}),
		).toMatchObject({ ok: false, code: "CONFLICT" });
	});
});

describe.runIf(hasDatabase)("platform work-item Drizzle parity", () => {
	afterAll(async () => {
		for (const organizationId of databaseOrganizations) {
			await afendaDatabase.client
				.delete(platformWorkItemActivity)
				.where(eq(platformWorkItemActivity.organizationId, organizationId));
			await afendaDatabase.client
				.delete(platformWorkItem)
				.where(eq(platformWorkItem.organizationId, organizationId));
		}
	});

	it.each([
		["approval", "approved"],
		["task", "completed"],
		["reminder", "dismissed"],
		["escalation", "in_progress"],
	] as const)("matches memory semantics for %s", async (kind, status) => {
		const organizationId = randomUUID();
		databaseOrganizations.add(organizationId);
		await expectLifecycle(
			createDrizzlePlatformWorkItemStore(),
			organizationId,
			kind,
			status,
		);
	});

	it("enforces the organization-scoped deduplication constraint", async () => {
		const organizationId = randomUUID();
		databaseOrganizations.add(organizationId);
		const store = createDrizzlePlatformWorkItemStore();
		const original = input(organizationId, "task", randomUUID());
		expect(await store.record(original)).toMatchObject({ ok: true });
		expect(
			await store.record({ ...original, title: "Different command" }),
		).toMatchObject({
			ok: false,
			code: "CONFLICT",
		});
		const [persisted] = await afendaDatabase.client
			.select({ id: platformWorkItem.id })
			.from(platformWorkItem)
			.where(
				and(
					eq(platformWorkItem.organizationId, organizationId),
					eq(platformWorkItem.deduplicationKey, original.deduplicationKey),
				),
			);
		expect(persisted).toBeDefined();
	});

	it("composes HR work-item facts into the production owner", async () => {
		const organizationId = randomUUID();
		databaseOrganizations.add(organizationId);
		const sink = createProductionHumanResourcesWorkItemSink();
		const workItem = {
			kind: "approval" as const,
			factVersion: 1 as const,
			eventId: `event-${randomUUID()}`,
			organizationId,
			correlationId: randomUUID(),
			targetUserId: "approver-1",
			entityType: "hr_leave_request",
			entityId: "leave-1",
			title: "Approve leave request",
			priority: "HIGH" as const,
			dueOn: "2026-08-01",
			deduplicationKey: `event:${randomUUID()}:work-item`,
		};
		const recorded = await sink.record({ workItem, actorUserId: "actor-1" });
		expect(recorded).toMatchObject({
			ok: true,
			data: { organizationId, deduplicationKey: workItem.deduplicationKey },
		});
		expect(await sink.record({ workItem, actorUserId: "actor-1" })).toEqual(
			recorded,
		);
	});
});
