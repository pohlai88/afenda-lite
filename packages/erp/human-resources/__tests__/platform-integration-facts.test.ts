import type { DomainEvent } from "@afenda/events";
import { describe, expect, it } from "vitest";

import { projectHumanResourcesPlatformFacts } from "../src/integrations/platform-facts";

function event(
	type: string,
	overrides: Partial<DomainEvent> = {},
): DomainEvent {
	return {
		id: "event-1",
		type,
		sourceModule: "human-resources",
		occurredAt: new Date("2026-07-24T00:00:00.000Z"),
		correlationId: "corr-1",
		causationId: null,
		organizationId: "org-1",
		actorUserId: "actor-1",
		payload: {
			organizationId: "org-1",
			entityType: "hr_employment",
			entityId: "employee-1",
			actorId: "actor-1",
			correlationId: "corr-1",
			operation: "human-resources.onboarding.start",
			idempotencyKey: "idem-1",
		},
		metadata: null,
		status: "pending",
		attempts: 0,
		lastError: null,
		processedAt: null,
		...overrides,
	};
}

describe("Human Resources platform facts", () => {
	it("projects workflow transitions with a policy snapshot and stable reporting fact", () => {
		const result = projectHumanResourcesPlatformFacts(
			event("human-resources.onboarding.started.v1"),
		);

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.workflow).toMatchObject({
			kind: "workflow_transition",
			workflow: "onboarding",
			transition: "started",
			outcome: "in_progress",
			policySnapshot: {
				operation: "human-resources.onboarding.start",
				idempotencyKey: "idem-1",
			},
		});
		expect(result.data.reporting).toMatchObject({
			factVersion: 1,
			requiredPermission: "human-resources.employee.read",
		});
	});

	it("projects joiner, mover, and leaver facts", () => {
		const types = [
			"human-resources.employment.started.v1",
			"human-resources.employee.transferred.v1",
			"human-resources.employee.terminated.v1",
		] as const;

		expect(
			types.map((type) => {
				const result = projectHumanResourcesPlatformFacts(event(type));
				if (!result.ok) throw new Error(result.message);
				return result.data.identity?.lifecycle;
			}),
		).toEqual(["joiner", "mover", "leaver"]);
	});

	it("creates replay-safe notification intent from event metadata recipient", () => {
		const result = projectHumanResourcesPlatformFacts(
			event("human-resources.employee-document.nearing-expiry.v1", {
				metadata: { recipientUserId: "employee-user-1" },
			}),
		);

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.notification).toMatchObject({
			recipientUserId: "employee-user-1",
			deduplicationKey: "event:event-1",
			type: "ACTION_REQUIRED",
		});
	});

	it("rejects an event whose payload crosses the envelope tenant", () => {
		const result = projectHumanResourcesPlatformFacts(
			event("human-resources.employee.transferred.v1", {
				payload: {
					organizationId: "org-other",
					entityType: "hr_employment",
					entityId: "employee-1",
					actorId: "actor-1",
					correlationId: "corr-1",
				},
			}),
		);

		expect(result.ok).toBe(false);
	});
});
