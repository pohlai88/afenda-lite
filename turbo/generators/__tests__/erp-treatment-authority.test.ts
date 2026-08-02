import { describe, expect, it } from "vitest";
import type { GeneratorDiagnostic } from "../engine/diagnostic-protocol.ts";
import { createGeneratorDiagnostic } from "../engine/diagnostic-protocol.ts";
import {
	createErpTreatmentPlan,
	renderErpTreatmentPlanTextLines,
} from "../erp-generator/treatment-authority.ts";

const diagnostic = ({
	code,
	treatment,
	severity = "warning",
	paths = ["packages/erp/inventory"],
}: {
	readonly code: string;
	readonly paths?: readonly string[];
	readonly severity?: "blocked" | "error" | "info" | "warning";
	readonly treatment:
		| "auto-reconcile"
		| "auto-regenerate"
		| "auto-upgrade"
		| "collision"
		| "remove-superseded"
		| "semantic-decision-required"
		| "unsupported";
}): GeneratorDiagnostic =>
	createGeneratorDiagnostic({
		code,
		severity,
		family: "erp",
		package: "@afenda/inventory",
		owner: "erp-generator test authority",
		treatment,
		paths,
		expected: { canonical: true },
		actual: { canonical: false },
	});

describe("ERP treatment authority", () => {
	it("maps canonical diagnostics into deterministic versioned recovery steps", () => {
		const plan = createErpTreatmentPlan({
			fromVersion: 0,
			diagnostics: [
				diagnostic({
					code: "AFG-ERP-201",
					treatment: "auto-reconcile",
					paths: ["packages/erp/inventory/src/composition/generator.lock.json"],
				}),
				diagnostic({
					code: "AFG-ERP-102",
					treatment: "auto-upgrade",
					paths: ["packages/erp/accounting"],
				}),
				diagnostic({
					code: "AFG-ERP-103",
					treatment: "remove-superseded",
					paths: ["packages/erp/payroll/scripts/feature-first-layout.mjs"],
				}),
			],
		});

		expect(plan).toEqual({
			schema: "afenda.erp-treatment-authority/v1",
			fromVersion: 0,
			toVersion: 1,
			summary: {
				total: 3,
				automatic: 3,
				manual: 0,
				ready: 3,
				blocked: 0,
				unsupported: 0,
			},
			steps: [
				expect.objectContaining({
					code: "AFG-ERP-102",
					actionKind: "upgrade-feature-first-layout",
					automation: "automatic",
					status: "ready",
					version: 1,
				}),
				expect.objectContaining({
					code: "AFG-ERP-103",
					actionKind: "remove-superseded-file",
					automation: "automatic",
					status: "ready",
					version: 1,
				}),
				expect.objectContaining({
					code: "AFG-ERP-201",
					actionKind: "reconcile-projection-lock",
					automation: "automatic",
					status: "ready",
					version: 1,
				}),
			],
		});
	});

	it("keeps semantic decisions and collisions blocked instead of auto-recovering them", () => {
		const plan = createErpTreatmentPlan({
			diagnostics: [
				diagnostic({
					code: "AFG-ERP-001",
					treatment: "semantic-decision-required",
					severity: "blocked",
				}),
				diagnostic({
					code: "AFG-ERP-101",
					treatment: "collision",
					severity: "blocked",
				}),
			],
		});

		expect(plan.summary).toEqual({
			total: 2,
			automatic: 0,
			manual: 2,
			ready: 0,
			blocked: 2,
			unsupported: 0,
		});
		expect(plan.steps).toEqual([
			expect.objectContaining({
				code: "AFG-ERP-001",
				actionKind: "request-semantic-decision",
				automation: "manual",
				status: "blocked",
			}),
			expect.objectContaining({
				code: "AFG-ERP-101",
				actionKind: "resolve-collision",
				automation: "manual",
				status: "blocked",
			}),
		]);
	});

	it("marks unknown diagnostic recovery as unsupported", () => {
		const plan = createErpTreatmentPlan({
			diagnostics: [
				diagnostic({
					code: "AFG-ERP-999",
					treatment: "unsupported",
					severity: "error",
				}),
			],
		});

		expect(plan.summary).toEqual({
			total: 1,
			automatic: 0,
			manual: 1,
			ready: 0,
			blocked: 0,
			unsupported: 1,
		});
		expect(plan.steps).toEqual([
			expect.objectContaining({
				code: "AFG-ERP-999",
				actionKind: "request-semantic-decision",
				status: "unsupported",
			}),
		]);
	});

	it("renders byte-stable treatment text lines for doctor output", () => {
		const plan = createErpTreatmentPlan({
			diagnostics: [
				diagnostic({
					code: "AFG-ERP-201",
					treatment: "auto-reconcile",
					paths: ["packages/erp/inventory/src/composition/generator.lock.json"],
				}),
			],
		});

		expect(renderErpTreatmentPlanTextLines(plan)).toEqual([
			"erp-treatment-schema=afenda.erp-treatment-authority/v1",
			"erp-treatment-version=1",
			"erp-treatment-from-version=0",
			"erp-treatment-count=1",
			"erp-treatment-ready=1",
			"erp-treatment-blocked=0",
			"erp-treatment-unsupported=0",
			"erp-treatment-automatic=1",
			"erp-treatment-manual=0",
			"erp-treatment=@afenda/inventory|AFG-ERP-201|ready|automatic|reconcile-projection-lock|packages/erp/inventory/src/composition/generator.lock.json",
		]);
	});
});
