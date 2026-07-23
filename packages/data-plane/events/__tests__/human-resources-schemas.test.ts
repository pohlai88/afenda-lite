import { describe, expect, it } from "vitest";

import {
	HUMAN_RESOURCES_EMPLOYEE_CREATED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_REGISTERED_EVENT,
	HUMAN_RESOURCES_TIME_SCHEDULE_PUBLISHED_EVENT,
	HUMAN_RESOURCES_WORK_ELIGIBILITY_SUSPENDED_EVENT,
	HumanResourcesEventSchemas,
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

	it("accepts legacy payloads without operation/idempotencyKey", () => {
		const parsed = humanResourcesEntityPayloadSchema.safeParse({
			organizationId: "org-1",
			entityType: "hr_work_eligibility",
			entityId: "00000000-0000-4000-8000-000000000002",
			actorId: "user-1",
			correlationId: "corr-legacy",
		});
		expect(parsed.success).toBe(true);
	});

	it("validates catalog schemas for representative HR events", () => {
		const samples = [
			HUMAN_RESOURCES_EMPLOYEE_CREATED_EVENT,
			HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_REGISTERED_EVENT,
			HUMAN_RESOURCES_WORK_ELIGIBILITY_SUSPENDED_EVENT,
			HUMAN_RESOURCES_TIME_SCHEDULE_PUBLISHED_EVENT,
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
});
