import { describe, expect, it } from "vitest";

import { createGeneratorDiagnostic } from "../engine/diagnostic-protocol.ts";
import {
	createGeneratorReconciliationPlan,
	GENERATOR_RECONCILIATION_PLAN_SCHEMA,
	renderGeneratorReconciliationPlanText,
} from "../engine/reconciliation-planner.ts";
import {
	captureRepositoryState,
	compareRepositoryStates,
} from "../engine/repository-state.ts";
import { erpGeneratorRegistration } from "../erp-generator/registration.ts";
import { kernelGeneratorRegistration } from "../kernel-generator/registration.ts";

describe("read-only reconciliation planner", () => {
	it("creates deterministic read-only operations from diagnostics", () => {
		const diagnostics = [
			createGeneratorDiagnostic({
				code: "AFG-ERP-201",
				severity: "warning",
				family: "erp",
				package: "@afenda/inventory",
				owner: "erp-generator projection lock authority",
				treatment: "auto-reconcile",
				paths: ["packages/erp/inventory/src/composition/generator.lock.json"],
				expected: { digest: "abc" },
				actual: { lockExists: false },
			}),
			createGeneratorDiagnostic({
				code: "AFG-ERP-002",
				severity: "blocked",
				family: "erp",
				package: "@afenda/sales",
				owner: "erp-generator manifest authority",
				treatment: "collision",
				paths: ["packages/erp/sales/src/module.manifest.ts"],
				expected: { canonical: true },
				actual: { duplicate: true },
			}),
			createGeneratorDiagnostic({
				code: "AFG-ERP-999",
				severity: "warning",
				family: "erp",
				package: "@afenda/payroll",
				owner: "erp-generator future authority",
				treatment: "unsupported",
				paths: ["packages/erp/payroll"],
				expected: { policy: true },
				actual: { policy: false },
			}),
		];

		const first = createGeneratorReconciliationPlan({
			family: "erp",
			diagnostics,
		});
		const second = createGeneratorReconciliationPlan({
			family: "erp",
			diagnostics,
		});

		expect(second).toEqual(first);
		expect(first).toEqual({
			schema: GENERATOR_RECONCILIATION_PLAN_SCHEMA,
			family: "erp",
			summary: {
				total: 3,
				ready: 1,
				blocked: 1,
				unsupported: 1,
				automatic: 1,
				manual: 2,
				lowRisk: 1,
				mediumRisk: 1,
				highRisk: 1,
			},
			operations: [
				expect.objectContaining({
					package: "@afenda/inventory",
					action: "reconcile-projection",
					status: "ready",
					automation: "automatic",
					risk: "low",
					writes: false,
				}),
				expect.objectContaining({
					package: "@afenda/payroll",
					action: "add-treatment-policy",
					status: "unsupported",
					automation: "manual",
					risk: "medium",
					writes: false,
				}),
				expect.objectContaining({
					package: "@afenda/sales",
					action: "resolve-collision-before-automation",
					status: "blocked",
					automation: "manual",
					risk: "high",
					writes: false,
				}),
			],
		});
	});

	it("renders a stable text plan", () => {
		const plan = createGeneratorReconciliationPlan({
			family: "kernel",
			diagnostics: [
				createGeneratorDiagnostic({
					code: "AFG-KERNEL-004",
					severity: "warning",
					family: "kernel",
					package: "@afenda/env",
					owner: "kernel-generator adoption authority",
					treatment: "auto-regenerate",
					paths: ["packages/foundation/env/CONTRACT.md"],
					expected: { contractPath: "CONTRACT.md" },
					actual: { contractExists: false },
				}),
			],
		});

		expect(renderGeneratorReconciliationPlanText(plan)).toContain(
			"kernel-generator upgrade plan\nschema=afenda.generator-reconciliation-plan/v1\nwrites=false",
		);
		expect(renderGeneratorReconciliationPlanText(plan)).toContain(
			"operation=@afenda/env|ready|automatic|regenerate-authority-owned-artifact|low|packages/foundation/env/CONTRACT.md",
		);
	});

	it("exposes read-only plan-upgrade through family registrations", {
		timeout: 30_000,
	}, async () => {
		const repositoryRoot = process.cwd();
		const before = await captureRepositoryState(repositoryRoot);
		const [erpText, erpJson, kernelText, kernelJson] = await Promise.all([
			erpGeneratorRegistration.planUpgrade(repositoryRoot),
			erpGeneratorRegistration.planUpgrade(repositoryRoot, { format: "json" }),
			kernelGeneratorRegistration.planUpgrade(repositoryRoot),
			kernelGeneratorRegistration.planUpgrade(repositoryRoot, {
				format: "json",
			}),
		]);
		const after = await captureRepositoryState(repositoryRoot);

		expect(compareRepositoryStates(before, after)).toEqual({
			added: [],
			changed: [],
			removed: [],
			count: 0,
		});
		expect(erpText).toContain("erp-generator upgrade plan");
		expect(erpText).toContain("writes=false");
		expect(kernelText).toContain("kernel-generator upgrade plan");
		expect(kernelText).toContain("writes=false");
		expect(JSON.parse(erpJson)).toEqual(
			expect.objectContaining({
				schema: GENERATOR_RECONCILIATION_PLAN_SCHEMA,
				family: "erp",
			}),
		);
		expect(JSON.parse(kernelJson)).toEqual(
			expect.objectContaining({
				schema: GENERATOR_RECONCILIATION_PLAN_SCHEMA,
				family: "kernel",
			}),
		);
	});
});
