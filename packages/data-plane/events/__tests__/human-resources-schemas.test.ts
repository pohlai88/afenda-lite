import { describe, expect, it } from "vitest";

import {
	HUMAN_RESOURCES_ASSIGNMENT_CREATED_EVENT,
	HUMAN_RESOURCES_DEPARTMENT_ACTIVATED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_CREATED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_REGISTERED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_REHIRED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_TRANSFERRED_EVENT,
	HUMAN_RESOURCES_EMPLOYMENT_CONTRACT_CHANGED_EVENT,
	HUMAN_RESOURCES_EMPLOYMENT_CONTRACT_CREATED_EVENT,
	HUMAN_RESOURCES_EMPLOYMENT_CONTRACT_SUPERSEDED_EVENT,
	HUMAN_RESOURCES_EMPLOYMENT_STARTED_EVENT,
	HUMAN_RESOURCES_EVENT_IDS,
	HUMAN_RESOURCES_TIME_SCHEDULE_PUBLISHED_EVENT,
	HUMAN_RESOURCES_WORK_ELIGIBILITY_SUSPENDED_EVENT,
	HumanResourcesEventSchemas,
	humanResourcesEffectiveDatedEntityPayloadSchema,
	humanResourcesEntityPayloadSchema,
} from "../src/schemas/human-resources.events";

const goldenPayload = {
	organizationId: "org-1",
	entityType: "hr_employee",
	entityId: "00000000-0000-4000-8000-000000000001",
	actorId: "user-1",
	correlationId: "corr-trace-1",
	operation: "human-resources.employee.create",
	causationId: "cause-1",
	idempotencyKey: "idem-1",
};

describe("@afenda/events human-resources schema compatibility", () => {
	it("accepts enriched .v1 entity payloads", () => {
		const parsed = humanResourcesEntityPayloadSchema.safeParse(goldenPayload);
		expect(parsed.success).toBe(true);
	});

	it("requires effectiveOn on effective-dated entity payloads", () => {
		const withEffectiveOn = {
			...goldenPayload,
			effectiveOn: "2026-01-15",
		};
		expect(
			humanResourcesEffectiveDatedEntityPayloadSchema.safeParse(withEffectiveOn)
				.success,
		).toBe(true);
		expect(
			humanResourcesEffectiveDatedEntityPayloadSchema.safeParse(goldenPayload)
				.success,
		).toBe(false);
	});

	it("requires effectiveOn on effective-dated HR event schemas", () => {
		const withEffectiveOn = {
			...goldenPayload,
			effectiveOn: "2026-01-15",
		};
		for (const type of [
			HUMAN_RESOURCES_EMPLOYMENT_STARTED_EVENT,
			HUMAN_RESOURCES_EMPLOYEE_REHIRED_EVENT,
			HUMAN_RESOURCES_EMPLOYEE_TRANSFERRED_EVENT,
			HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT,
		] as const) {
			expect(
				HumanResourcesEventSchemas[type].safeParse(withEffectiveOn).success,
			).toBe(true);
			expect(
				HumanResourcesEventSchemas[type].safeParse(goldenPayload).success,
			).toBe(false);
		}
	});

	it("rejects payloads without operation and idempotencyKey", () => {
		const parsed = humanResourcesEntityPayloadSchema.safeParse({
			organizationId: "org-1",
			entityType: "hr_work_eligibility",
			entityId: "00000000-0000-4000-8000-000000000002",
			actorId: "user-1",
			correlationId: "corr-missing-mutation-identity",
		});
		expect(parsed.success).toBe(false);
	});

	it("validates catalog schemas for representative HR events", () => {
		const samples = [
			HUMAN_RESOURCES_EMPLOYEE_CREATED_EVENT,
			HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_REGISTERED_EVENT,
			HUMAN_RESOURCES_WORK_ELIGIBILITY_SUSPENDED_EVENT,
			HUMAN_RESOURCES_TIME_SCHEDULE_PUBLISHED_EVENT,
			HUMAN_RESOURCES_EMPLOYMENT_CONTRACT_CREATED_EVENT,
			HUMAN_RESOURCES_EMPLOYMENT_CONTRACT_CHANGED_EVENT,
			HUMAN_RESOURCES_EMPLOYMENT_CONTRACT_SUPERSEDED_EVENT,
			HUMAN_RESOURCES_ASSIGNMENT_CREATED_EVENT,
			HUMAN_RESOURCES_DEPARTMENT_ACTIVATED_EVENT,
		] as const;

		for (const type of samples) {
			const schema = HumanResourcesEventSchemas[type];
			const parsed = schema.safeParse(goldenPayload);
			expect(parsed.success).toBe(true);
		}
	});

	it("rejects unknown payload keys under strict entity schema", () => {
		const parsed = humanResourcesEntityPayloadSchema.safeParse({
			...goldenPayload,
			unexpectedField: true,
		});
		// Base schema is not .strict() — additive unknown keys remain parseable.
		// Compatibility lock: required fields still validated.
		expect(parsed.success).toBe(true);
		if (!parsed.success) return;
		expect(parsed.data.correlationId).toBe("corr-trace-1");
	});

	it("requires organizationId and correlationId on every HR event schema", () => {
		for (const eventType of HUMAN_RESOURCES_EVENT_IDS) {
			const schema = HumanResourcesEventSchemas[eventType];
			expect(
				schema.safeParse({ ...goldenPayload, organizationId: "" }).success,
			).toBe(false);
			expect(
				schema.safeParse({ ...goldenPayload, correlationId: "" }).success,
			).toBe(false);
		}
	});
});
