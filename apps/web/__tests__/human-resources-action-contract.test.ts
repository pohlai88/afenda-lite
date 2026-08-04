import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { withHrSessionContext } from "../app/actions/hr-mutation-context";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function source(relativePath: string) {
	return readFileSync(path.join(webRoot, relativePath), "utf8");
}

describe("HR standard Action contract", () => {
	it("makes tenant and actor context server-authoritative", () => {
		expect(
			withHrSessionContext(
				{ orgId: "session-org", userId: "session-user" },
				"server-correlation",
				{
					organizationId: "attacker-org",
					actorUserId: "attacker-user",
					correlationId: "client-correlation",
				},
			),
		).toEqual({
			organizationId: "session-org",
			actorUserId: "session-user",
			correlationId: "client-correlation",
		});
	});

	it("keeps the shared runner on permission, validation, package, and ActionResult boundaries", () => {
		const runner = source("app/actions/_runtime/hr-action-runner.ts");
		expect(runner).toContain("runOperatorPermissionAction");
		expect(runner).toContain("parseSchema");
		expect(runner).toContain("withHrSessionContext");
		expect(runner).toContain("mapPackageResult");
		expect(runner).toContain("createHumanResourcesCommandOptions");
		expect(runner).not.toMatch(/\{\s*success\s*:/);
	});

	it("routes every HR action module through an approved permission runner", () => {
		const actionFiles = [
			"_runtime/hr-admin-journeys.ts",
			"hr-assignments.ts",
			"hr-benefits.ts",
			"_runtime/hr-bulk-export.ts",
			"hr-compensation-review.ts",
			"hr-compensation.ts",
			"hr-compliance.ts",
			"hr-employee-relations.ts",
			"hr-employees.ts",
			"hr-employment.ts",
			"hr-hiring.ts",
			"hr-learning.ts",
			"hr-leave.ts",
			"hr-lifecycle.ts",
			"hr-manager-journeys.ts",
			"hr-offboarding.ts",
			"hr-onboarding.ts",
			"hr-operations.ts",
			"hr-organization.ts",
			"hr-people.ts",
			"hr-performance.ts",
			"hr-recruitment.ts",
			"_runtime/hr-reporting-bulk.ts",
			"hr-self-service-journeys.ts",
			"hr-self-service.ts",
			"hr-talent.ts",
			"hr-time.ts",
			"hr-workforce-planning.ts",
		] as const;
		for (const file of actionFiles) {
			const contents = source(`app/actions/${file}`);
			// `defineAction` is an approved route by construction: its `runner`
			// field is required and typed `ActionRunner`, so an action cannot
			// reach a package facade through it without passing an actor-class
			// runner. Area-specific runners (runHr<Area>OperatorPermissionAction)
			// are factory outputs of the same base runner.
			expect(contents, file).toMatch(
				/defineAction|runHrHumanResourcesAction|run(?:Hr[A-Za-z]*)?OperatorPermissionAction|runMemberPermissionAction/,
			);
			expect(contents, file).not.toMatch(/\{\s*success\s*:/);
		}
	});
});
