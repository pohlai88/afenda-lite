/**
 * Memory vs Drizzle parity for organization-structure invariants (HR-03).
 */

import { afterAll, describe, expect, it } from "vitest";
import {
	archiveDepartment,
	createDepartment,
	getDepartmentAsOf,
	getOrganizationTree,
	updateDepartment,
} from "../src/features/organization/department";
import {
	createJob,
	getJobAsOf,
	updateJob,
} from "../src/features/organization/job";
import {
	createPosition,
	getPositionAsOf,
	updatePosition,
} from "../src/features/organization/position";
import {
	assignPrimaryReportingLine,
	replacePrimaryReportingLine,
	resolvePrimaryManager,
} from "../src/features/organization/reporting-line";
import { createEmployee } from "../src/features/workforce-records/employment/employee";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
	HUMAN_RESOURCES_ERROR_STALE_VERSION,
} from "../src/kernel/execution/error-codes";
import {
	runSequential,
	sequentialReturn,
} from "../src/kernel/execution/run-sequential";
import { runDrizzleParity } from "./helpers/database-gate";
import { helperAssert as assert } from "./helpers/helper-assert";
import {
	createHrParityHarness,
	type WorkforceStoreAdapter,
} from "./helpers/hr-parity-harness";
import { createMemoryMutationPorts } from "./helpers/memory-ports";
import { createNeonOrgTracker } from "./helpers/neon-cleanup";
import { humanResourcesCodeFromResult } from "./helpers/result-details";

function uniqueSuffix(adapter: WorkforceStoreAdapter): string {
	return `${adapter}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function defineOrganizationParitySuite(adapter: WorkforceStoreAdapter): void {
	const suffix = uniqueSuffix(adapter);
	const neonOrgs = createNeonOrgTracker();
	const ORG = neonOrgs.trackOrg(`org-hr-org-parity-${suffix}`);
	const ORG_B = neonOrgs.trackOrg(`org-hr-org-parity-b-${suffix}`);
	const ACTOR = `user-hr-org-parity-${suffix}`;

	afterAll(async () => {
		if (adapter === "drizzle") {
			await neonOrgs.cleanup();
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
		if (!root.ok) {
			return;
		}

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
		if (!child.ok) {
			return;
		}

		const cycle = await updateDepartment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-cycle-${suffix}`,
				departmentId: root.data.id,
				parentDepartmentId: child.data.id,
				expectedVersion: 1,
				effectiveOn: "2099-01-01",
				reasonCode: "restructure",
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
		if (!parent.ok) {
			return;
		}

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
		if (!parent.ok) {
			return;
		}

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
		if (!(employee.ok && m1.ok && m2.ok)) {
			return;
		}

		const self = await assignPrimaryReportingLine(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-self-${suffix}`,
				employeeId: employee.data.id,
				managerEmployeeId: employee.data.id,
				startsOn: "2099-01-01",
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
				startsOn: "2099-01-01",
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
				startsOn: "2099-01-01",
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
				startsOn: "2099-02-01",
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
				startsOn: "2099-03-01",
				closePriorOn: "2099-02-28",
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
				asOf: "2099-03-15",
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
		if (!(employee.ok && m1.ok && m2.ok)) {
			return;
		}

		const first = await assignPrimaryReportingLine(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-ov1-${suffix}`,
				employeeId: employee.data.id,
				managerEmployeeId: m1.data.id,
				startsOn: "2099-01-01",
				endsOn: "2099-06-30",
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
				startsOn: "2099-06-01",
				endsOn: "2099-12-31",
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
		if (!(empA.ok && empB.ok)) {
			return;
		}

		const cross = await assignPrimaryReportingLine(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-cross-${suffix}`,
				employeeId: empA.data.id,
				managerEmployeeId: empB.data.id,
				startsOn: "2099-01-01",
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
		if (!department.ok) {
			return;
		}

		const stale = await updateDepartment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-stale-2-${suffix}`,
				departmentId: department.data.id,
				name: "Updated",
				expectedVersion: 99,
				effectiveOn: "2099-01-01",
				reasonCode: "rename",
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

	it("maps department, job, and position definition histories across as-of boundaries", async () => {
		const ready = createHrParityHarness(adapter);
		const initialEffectiveOn = new Date().toISOString().slice(0, 10);
		const department = await createDepartment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-history-department-${suffix}`,
				code: `HIST-DEPT-${suffix}`,
				name: "Original Department",
			},
			ready,
		);
		expect(department.ok).toBe(true);
		if (!department.ok) {
			return;
		}

		const departmentUpdated = await updateDepartment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-history-department-update-${suffix}`,
				departmentId: department.data.id,
				name: "Renamed Department",
				expectedVersion: department.data.version,
				effectiveOn: "2099-08-01",
				reasonCode: "rename",
			},
			ready,
		);
		expect(departmentUpdated.ok).toBe(true);

		const job = await createJob(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-history-job-${suffix}`,
				code: `HIST-JOB-${suffix}`,
				title: "Original Job",
			},
			ready,
		);
		expect(job.ok).toBe(true);
		if (!job.ok) {
			return;
		}

		const jobUpdated = await updateJob(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-history-job-update-${suffix}`,
				jobId: job.data.id,
				title: "Updated Job",
				expectedVersion: job.data.version,
				effectiveOn: "2099-09-01",
				reasonCode: "title_change",
			},
			ready,
		);
		expect(jobUpdated.ok).toBe(true);

		const position = await createPosition(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-history-position-${suffix}`,
				code: `HIST-POS-${suffix}`,
				title: "Original Position",
				departmentId: department.data.id,
				jobId: job.data.id,
			},
			ready,
		);
		expect(position.ok).toBe(true);
		if (!position.ok) {
			return;
		}

		const positionUpdated = await updatePosition(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-history-position-update-${suffix}`,
				positionId: position.data.id,
				title: "Updated Position",
				expectedVersion: position.data.version,
				effectiveOn: "2099-10-01",
				reasonCode: "title_change",
			},
			ready,
		);
		expect(positionUpdated.ok).toBe(true);

		const [
			departmentBefore,
			departmentAfter,
			jobBefore,
			jobAfter,
			positionBefore,
			positionAfter,
		] = await Promise.all([
			getDepartmentAsOf(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: `corr-history-department-before-${suffix}`,
					departmentId: department.data.id,
					asOf: initialEffectiveOn,
				},
				ready,
			),
			getDepartmentAsOf(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: `corr-history-department-after-${suffix}`,
					departmentId: department.data.id,
					asOf: "2099-08-15",
				},
				ready,
			),
			getJobAsOf(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: `corr-history-job-before-${suffix}`,
					jobId: job.data.id,
					asOf: "2099-08-15",
				},
				ready,
			),
			getJobAsOf(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: `corr-history-job-after-${suffix}`,
					jobId: job.data.id,
					asOf: "2099-09-15",
				},
				ready,
			),
			getPositionAsOf(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: `corr-history-position-before-${suffix}`,
					positionId: position.data.id,
					asOf: "2099-09-15",
				},
				ready,
			),
			getPositionAsOf(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: `corr-history-position-after-${suffix}`,
					positionId: position.data.id,
					asOf: "2099-10-15",
				},
				ready,
			),
		]);

		expect(departmentBefore).toMatchObject({
			ok: true,
			data: { name: "Original Department" },
		});
		expect(departmentAfter).toMatchObject({
			ok: true,
			data: { name: "Renamed Department" },
		});
		expect(jobBefore).toMatchObject({
			ok: true,
			data: { title: "Original Job" },
		});
		expect(jobAfter).toMatchObject({
			ok: true,
			data: { title: "Updated Job" },
		});
		expect(positionBefore).toMatchObject({
			ok: true,
			data: { title: "Original Position" },
		});
		expect(positionAfter).toMatchObject({
			ok: true,
			data: { title: "Updated Position" },
		});

		const crossTenant = await getDepartmentAsOf(
			{
				organizationId: ORG_B,
				actorUserId: ACTOR,
				correlationId: `corr-history-cross-tenant-${suffix}`,
				departmentId: department.data.id,
				asOf: "2099-08-15",
			},
			ready,
		);
		expect(crossTenant.ok).toBe(false);
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
			assert.strictEqual(department.ok, false);
			const listed = await ready.store.listDepartments({
				organizationId: ORG,
				page: 1,
				pageSize: 20,
			});
			assert.strictEqual(listed.ok, true);
			if (listed.ok) {
				assert.strictEqual(listed.data.totalCount, 0);
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
		if (!root.ok) {
			return;
		}

		let parentId = root.data.id;
		const seedOutcome = await runSequential([0, 1, 2, 3, 4, 5], async (i) => {
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
			if (!next.ok) {
				return sequentialReturn(false);
			}
			parentId = next.data.id;
		});
		if (seedOutcome.kind === "return") {
			return;
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

describe.runIf(runDrizzleParity)(
	"@afenda/human-resources organization parity (drizzle/neon)",
	() => {
		defineOrganizationParitySuite("drizzle");
	},
);
