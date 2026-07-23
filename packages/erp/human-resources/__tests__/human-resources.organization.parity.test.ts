/**
 * Memory vs Drizzle parity for organization-structure invariants (HR-03).
 */

import { resolveDatabaseUrlForTests } from "@afenda/testing/require-database-for-ci";
import { afterAll, describe, expect, it } from "vitest";

import { createEmployee } from "../src/core/employee";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
	HUMAN_RESOURCES_ERROR_STALE_VERSION,
} from "../src/error-codes";
import {
	archiveDepartment,
	createDepartment,
	getOrganizationTree,
	updateDepartment,
} from "../src/organization/department";
import {
	assignPrimaryReportingLine,
	replacePrimaryReportingLine,
	resolvePrimaryManager,
} from "../src/organization/reporting-line";
import { createMemoryMutationPorts } from "./helpers/memory-ports";
import { cleanupHumanResourcesNeonOrgs } from "./helpers/neon-cleanup";
import { humanResourcesCodeFromResult } from "./helpers/result-details";
import {
	createHrParityHarness,
	type WorkforceStoreAdapter,
} from "./helpers/hr-parity-harness";

const { hasDatabase } = resolveDatabaseUrlForTests();

function uniqueSuffix(adapter: WorkforceStoreAdapter): string {
	return `${adapter}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function defineOrganizationParitySuite(adapter: WorkforceStoreAdapter): void {
	const suffix = uniqueSuffix(adapter);
	const ORG = `org-hr-org-parity-${suffix}`;
	const ORG_B = `org-hr-org-parity-b-${suffix}`;
	const ACTOR = `user-hr-org-parity-${suffix}`;

	afterAll(async () => {
		if (adapter === "drizzle") {
			await cleanupHumanResourcesNeonOrgs([ORG, ORG_B]);
		}
	});

	it("rejects department hierarchy cycles", async () => {
		const ready = createHrParityHarness(adapter);
		const root = await createDepartment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-root-${suffix}`,
				code: `ROOT-${suffix}`,
				name: "Root",
			},
			ready,
		);
		expect(root.ok).toBe(true);
		if (!root.ok) return;

		const child = await createDepartment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-child-${suffix}`,
				code: `CHILD-${suffix}`,
				name: "Child",
				parentDepartmentId: root.data.id,
			},
			ready,
		);
		expect(child.ok).toBe(true);
		if (!child.ok) return;

		const cycle = await updateDepartment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-cycle-${suffix}`,
				departmentId: root.data.id,
				parentDepartmentId: child.data.id,
				expectedVersion: 1,
			},
			ready,
		);
		expect(cycle.ok).toBe(false);
		if (!cycle.ok) {
			expect(humanResourcesCodeFromResult(cycle)).toBe(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			);
		}
	});

	it("rejects archived parent department", async () => {
		const ready = createHrParityHarness(adapter);
		const parent = await createDepartment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-parent-${suffix}`,
				code: `P1-${suffix}`,
				name: "Parent",
			},
			ready,
		);
		expect(parent.ok).toBe(true);
		if (!parent.ok) return;

		const archived = await archiveDepartment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-archive-parent-${suffix}`,
				departmentId: parent.data.id,
				expectedVersion: 1,
			},
			ready,
		);
		expect(archived.ok).toBe(true);

		const child = await createDepartment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-child-bad-parent-${suffix}`,
				code: `C1-${suffix}`,
				name: "Child",
				parentDepartmentId: parent.data.id,
			},
			ready,
		);
		expect(child.ok).toBe(false);
		if (!child.ok) {
			expect(humanResourcesCodeFromResult(child)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			);
		}
	});

	it("blocks archive when active child references department", async () => {
		const ready = createHrParityHarness(adapter);
		const parent = await createDepartment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p2-${suffix}`,
				code: `P2-${suffix}`,
				name: "Parent 2",
			},
			ready,
		);
		expect(parent.ok).toBe(true);
		if (!parent.ok) return;

		const child = await createDepartment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-c2-${suffix}`,
				code: `C2-${suffix}`,
				name: "Child 2",
				parentDepartmentId: parent.data.id,
			},
			ready,
		);
		expect(child.ok).toBe(true);

		const blocked = await archiveDepartment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-archive-blocked-${suffix}`,
				departmentId: parent.data.id,
				expectedVersion: 1,
			},
			ready,
		);
		expect(blocked.ok).toBe(false);
		if (!blocked.ok) {
			expect(humanResourcesCodeFromResult(blocked)).toBe(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			);
		}
	});

	it("rejects self-report, reporting cycles, and second open primary; replace then resolve", async () => {
		const ready = createHrParityHarness(adapter);
		const employee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-e-${suffix}`,
				idempotencyKey: `idem-e-${suffix}`,
				employeeNumber: `E-${suffix}`,
				legalName: "Employee",
			},
			ready,
		);
		const m1 = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-m1-${suffix}`,
				idempotencyKey: `idem-m1-${suffix}`,
				employeeNumber: `M1-${suffix}`,
				legalName: "Manager 1",
			},
			ready,
		);
		const m2 = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-m2-${suffix}`,
				idempotencyKey: `idem-m2-${suffix}`,
				employeeNumber: `M2-${suffix}`,
				legalName: "Manager 2",
			},
			ready,
		);
		expect(employee.ok && m1.ok && m2.ok).toBe(true);
		if (!employee.ok || !m1.ok || !m2.ok) return;

		const self = await assignPrimaryReportingLine(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-self-${suffix}`,
				employeeId: employee.data.id,
				managerEmployeeId: employee.data.id,
				startsOn: "2026-01-01",
			},
			ready,
		);
		expect(self.ok).toBe(false);
		if (!self.ok) {
			expect(humanResourcesCodeFromResult(self)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			);
		}

		const first = await assignPrimaryReportingLine(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p1-${suffix}`,
				employeeId: employee.data.id,
				managerEmployeeId: m1.data.id,
				startsOn: "2026-01-01",
			},
			ready,
		);
		expect(first.ok).toBe(true);

		const reportingCycle = await assignPrimaryReportingLine(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-rcycle-${suffix}`,
				employeeId: m1.data.id,
				managerEmployeeId: employee.data.id,
				startsOn: "2026-01-01",
			},
			ready,
		);
		expect(reportingCycle.ok).toBe(false);
		if (!reportingCycle.ok) {
			expect(humanResourcesCodeFromResult(reportingCycle)).toBe(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			);
		}

		const second = await assignPrimaryReportingLine(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p2-${suffix}`,
				employeeId: employee.data.id,
				managerEmployeeId: m2.data.id,
				startsOn: "2026-02-01",
			},
			ready,
		);
		expect(second.ok).toBe(false);
		if (!second.ok) {
			expect(humanResourcesCodeFromResult(second)).toBe(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			);
		}

		const replaced = await replacePrimaryReportingLine(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-rep-${suffix}`,
				employeeId: employee.data.id,
				managerEmployeeId: m2.data.id,
				startsOn: "2026-03-01",
				closePriorOn: "2026-02-28",
			},
			ready,
		);
		expect(replaced.ok).toBe(true);

		const current = await resolvePrimaryManager(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-res-${suffix}`,
				employeeId: employee.data.id,
				asOf: "2026-03-15",
			},
			ready,
		);
		expect(current.ok).toBe(true);
		if (current.ok) {
			expect(current.data?.managerEmployeeId).toBe(m2.data.id);
		}
	});

	it("rejects overlapping primary date ranges", async () => {
		const ready = createHrParityHarness(adapter);
		const employee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-ov-e-${suffix}`,
				idempotencyKey: `idem-ov-e-${suffix}`,
				employeeNumber: `E-OV-${suffix}`,
				legalName: "Overlap",
			},
			ready,
		);
		const m1 = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-ov-m1-${suffix}`,
				idempotencyKey: `idem-ov-m1-${suffix}`,
				employeeNumber: `E-OM1-${suffix}`,
				legalName: "M1",
			},
			ready,
		);
		const m2 = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-ov-m2-${suffix}`,
				idempotencyKey: `idem-ov-m2-${suffix}`,
				employeeNumber: `E-OM2-${suffix}`,
				legalName: "M2",
			},
			ready,
		);
		expect(employee.ok && m1.ok && m2.ok).toBe(true);
		if (!employee.ok || !m1.ok || !m2.ok) return;

		const first = await assignPrimaryReportingLine(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-ov1-${suffix}`,
				employeeId: employee.data.id,
				managerEmployeeId: m1.data.id,
				startsOn: "2026-01-01",
				endsOn: "2026-06-30",
			},
			ready,
		);
		expect(first.ok).toBe(true);

		const overlap = await assignPrimaryReportingLine(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-ov2-${suffix}`,
				employeeId: employee.data.id,
				managerEmployeeId: m2.data.id,
				startsOn: "2026-06-01",
				endsOn: "2026-12-31",
			},
			ready,
		);
		expect(overlap.ok).toBe(false);
		if (!overlap.ok) {
			expect(humanResourcesCodeFromResult(overlap)).toBe(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			);
		}
	});

	it("isolates cross-organization reporting", async () => {
		const ready = createHrParityHarness(adapter);
		const empA = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-xa-${suffix}`,
				idempotencyKey: `idem-xa-${suffix}`,
				employeeNumber: `E-XA-${suffix}`,
				legalName: "A",
			},
			ready,
		);
		const empB = await createEmployee(
			{
				organizationId: ORG_B,
				actorUserId: ACTOR,
				correlationId: `corr-xb-${suffix}`,
				idempotencyKey: `idem-xb-${suffix}`,
				employeeNumber: `E-XB-${suffix}`,
				legalName: "B",
			},
			ready,
		);
		expect(empA.ok && empB.ok).toBe(true);
		if (!empA.ok || !empB.ok) return;

		const cross = await assignPrimaryReportingLine(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-cross-${suffix}`,
				employeeId: empA.data.id,
				managerEmployeeId: empB.data.id,
				startsOn: "2026-01-01",
			},
			ready,
		);
		expect(cross.ok).toBe(false);
		if (!cross.ok) {
			expect(humanResourcesCodeFromResult(cross)).toBe(
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}
	});

	it("maps stale expectedVersion on department update", async () => {
		const ready = createHrParityHarness(adapter);
		const department = await createDepartment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-stale-${suffix}`,
				code: `STALE-${suffix}`,
				name: "Stale",
			},
			ready,
		);
		expect(department.ok).toBe(true);
		if (!department.ok) return;

		const stale = await updateDepartment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-stale-2-${suffix}`,
				departmentId: department.data.id,
				name: "Updated",
				expectedVersion: 99,
			},
			ready,
		);
		expect(stale.ok).toBe(false);
		if (!stale.ok) {
			expect(humanResourcesCodeFromResult(stale)).toBe(
				HUMAN_RESOURCES_ERROR_STALE_VERSION,
			);
		}
	});

	// Memory uses MutationPorts.audit; Drizzle audits inside the SQL CTE (same TX).
	it.runIf(adapter === "memory")(
		"rolls back department create when audit port fails",
		async () => {
			const base = createHrParityHarness(adapter);
			const ports = createMemoryMutationPorts({ auditFailAfter: 0 });
			const ready = { ...base, ports };
			const department = await createDepartment(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: `corr-tx-${suffix}`,
					code: `TX-${suffix}`,
					name: "TX Dept",
				},
				ready,
			);
			expect(department.ok).toBe(false);
			const listed = await ready.store.listDepartments({
				organizationId: ORG,
				page: 1,
				pageSize: 20,
			});
			expect(listed.ok).toBe(true);
			if (listed.ok) {
				expect(listed.data.totalCount).toBe(0);
			}
		},
	);

	it("returns bounded organization tree without unbounded recursion", async () => {
		const ready = createHrParityHarness(adapter);
		const root = await createDepartment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-tree-root-${suffix}`,
				code: `T-ROOT-${suffix}`,
				name: "Tree Root",
			},
			ready,
		);
		expect(root.ok).toBe(true);
		if (!root.ok) return;

		let parentId = root.data.id;
		for (let i = 0; i < 6; i += 1) {
			const next = await createDepartment(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: `corr-tree-${i}-${suffix}`,
					code: `T-${i}-${suffix}`,
					name: `Level ${i}`,
					parentDepartmentId: parentId,
				},
				ready,
			);
			expect(next.ok).toBe(true);
			if (!next.ok) return;
			parentId = next.data.id;
		}

		const tree = await getOrganizationTree(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-tree-${suffix}`,
				maxDepth: 2,
				maxNodes: 10,
			},
			ready,
		);
		expect(tree.ok).toBe(true);
		if (tree.ok) {
			expect(tree.data.nodes.length).toBeLessThanOrEqual(10);
			expect(tree.data.nodes.every((n) => n.depth <= 2)).toBe(true);
			expect(tree.data.truncated).toBe(true);
		}
	});
}

describe("@afenda/human-resources organization parity (memory)", () => {
	defineOrganizationParitySuite("memory");
});

describe.runIf(hasDatabase)(
	"@afenda/human-resources organization parity (drizzle/neon)",
	() => {
		defineOrganizationParitySuite("drizzle");
	},
);
