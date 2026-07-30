import type { DomainEvent } from "@afenda/events";
import { describe, expect, it } from "vitest";
import { projectHumanResourcesAccountingProvisioningFacts } from "../src/integrations/accounting-provisioning-facts";

function event(
	type: string,
	metadata: Record<string, unknown> = {},
): DomainEvent {
	return {
		id: `event-${type}`,
		type,
		sourceModule: "human-resources",
		occurredAt: new Date("2026-07-28T00:00:00.000Z"),
		correlationId: "corr-1",
		causationId: null,
		organizationId: "org-1",
		actorUserId: "actor-1",
		payload: {
			organizationId: "org-1",
			entityType: "hr_employee",
			entityId: "entity-1",
			actorId: "actor-1",
			correlationId: "corr-1",
			operation: "human-resources.integration.project",
			idempotencyKey: `idem-${type}`,
		},
		metadata,
		status: "pending",
		attempts: 0,
		lastError: null,
		processedAt: null,
	};
}

describe("Human Resources accounting and provisioning facts", () => {
	it.each([
		[
			"human-resources.time.payroll_handoff.ready.v1",
			{ approvalEvidenceId: "approval-1" },
			"payroll_posting",
		],
		[
			"human-resources.assignment.created.v1",
			{ costCentreId: "cc-1", allocationPercentage: "75.5000" },
			"cost_centre_allocation",
		],
		["human-resources.headcount-plan.approved.v1", {}, "headcount_budget"],
		["human-resources.employment.started.v1", {}, "access_provisioning"],
		["human-resources.onboarding.started.v1", {}, "equipment_assignment"],
	] as const)("projects %s as %s", (type, metadata, expectedKind) => {
		const result = projectHumanResourcesAccountingProvisioningFacts(
			event(type, metadata),
		);

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.data).toEqual([
			expect.objectContaining({
				kind: expectedKind,
				organizationId: "org-1",
				correlationId: "corr-1",
				factVersion: 1,
			}),
		]);
	});

	it("rejects missing approval evidence and invalid allocations", () => {
		expect(
			projectHumanResourcesAccountingProvisioningFacts(
				event("human-resources.time.payroll_handoff.ready.v1"),
			).ok,
		).toBe(false);
		expect(
			projectHumanResourcesAccountingProvisioningFacts(
				event("human-resources.assignment.created.v1", {
					costCentreId: "cc-1",
					allocationPercentage: "101",
				}),
			).ok,
		).toBe(false);
	});

	it("fails closed when the payload crosses the event tenant", () => {
		const crossTenant = event("human-resources.employment.started.v1");
		crossTenant.payload = {
			organizationId: "org-other",
			entityType: "hr_employee",
			entityId: "employee-1",
			actorId: "actor-1",
			correlationId: "corr-1",
			operation: "human-resources.integration.project",
			idempotencyKey: "idem-cross-tenant",
		};

		expect(
			projectHumanResourcesAccountingProvisioningFacts(crossTenant).ok,
		).toBe(false);
	});
});
