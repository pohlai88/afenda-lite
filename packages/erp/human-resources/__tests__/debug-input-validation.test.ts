import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { HumanResourcesEmployeeId } from "../src/brands";
import { parseHumanResourcesEmployeeId } from "../src/brands";
import { listEmployeeGoalsInputSchema } from "../src/schemas/performance";

describe("Debug Input Validation", () => {
	it("should validate the input schema correctly", () => {
		const organizationId = "org-123";
		const correlationId = "test-correlation-123";
		const actorUserId = "user-actor-1";
		const employeeId = (() => {
			const parsed = parseHumanResourcesEmployeeId(randomUUID());
			if (!parsed.ok) {
				throw new Error("Failed to parse employee id");
			}
			return parsed.data as HumanResourcesEmployeeId;
		})();

		const input = {
			organizationId,
			correlationId,
			actorUserId,
			employeeId,
		};

		console.log("Testing input:", input);

		const result = listEmployeeGoalsInputSchema.safeParse(input);

		if (!result.success) {
			console.log("Validation errors:", result.error.flatten());
		}

		expect(result.success).toBe(true);
	});
});
