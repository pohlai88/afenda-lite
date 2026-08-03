import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

function readCompositionFile(relativePath: string): string {
	return readFileSync(
		fileURLToPath(new URL(`../lib/erp/${relativePath}`, import.meta.url)),
		"utf8",
	);
}

describe("Payroll application composition", () => {
	it("constructs only the opaque Payroll capability context without an HR pull", () => {
		const source = readCompositionFile("payroll-command-options.ts");

		expect(source).toContain("createPayrollCapabilityOptions");
		expect(source).not.toContain("createPayrollWorkforcePort");
		expect(source).not.toContain("assembleApprovedPayrollHandoff");
		expect(source).not.toContain("import type { PayrollCommandOptions");
	});

	it("routes durable payroll deliveries into the Payroll ingest capability", () => {
		const source = readFileSync(
			fileURLToPath(
				new URL(
					"../modules/platform/domain/human-resources-payroll-delivery.ts",
					import.meta.url,
				),
			),
			"utf8",
		);

		expect(source).toContain("ingestApprovedPayrollHandoff");
		expect(source).toContain('from "@afenda/payroll"');
		expect(source).toContain("idempotencyKey: `payroll-delivery:");
	});

	it("assembles delivery payloads server-side instead of trusting caller-authored approved facts", () => {
		const source = readFileSync(
			fileURLToPath(
				new URL("../app/actions/hr-payroll-delivery.ts", import.meta.url),
			),
			"utf8",
		);

		expect(source).toContain("assembleApprovedPayrollHandoff");
		expect(source).toContain("organizationId: session.orgId");
		expect(source).toContain("actorUserId: session.userId");
		expect(source).not.toContain("payload: ApprovedPayrollHandoff");
		expect(source).not.toContain("approvedPayrollHandoffSchema");
	});
});
