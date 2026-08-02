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
	it("constructs only the opaque Payroll capability context", () => {
		const source = readCompositionFile("payroll-command-options.ts");

		expect(source).toContain("createPayrollCapabilityOptions");
		expect(source).toContain("workforce: createPayrollWorkforcePort()");
		expect(source).not.toContain("import type { PayrollCommandOptions");
	});

	it("projects the sealed HR payroll handoff without a null stub", () => {
		const source = readCompositionFile("payroll-workforce-port.ts");

		expect(source).toContain("assembleApprovedPayrollHandoff");
		expect(source).toContain('from "@afenda/human-resources"');
		expect(source).not.toContain("return await null");
		expect(source).not.toContain("component.kind");
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
