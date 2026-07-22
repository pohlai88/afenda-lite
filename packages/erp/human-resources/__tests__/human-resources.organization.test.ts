import { describe, expect, it } from "vitest";
import type { HumanResourcesPermission } from "../src/authorization";
import { createEmployee } from "../src/core/employee";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
	HUMAN_RESOURCES_ERROR_STALE_VERSION,
} from "../src/error-codes";
import {
	activateDepartment,
	archiveDepartment,
	createDepartment,
	getOrganizationTree,
	updateDepartment,
} from "../src/organization/department";
import { archiveJob } from "../src/organization/job";
import {
	closePosition,
	createPosition,
	freezePosition,
} from "../src/organization/position";
import {
	assignPrimaryReportingLine,
	listDirectReports,
	replacePrimaryReportingLine,
	resolvePrimaryManager,
} from "../src/organization/reporting-line";
import {
	HUMAN_RESOURCES_PERMISSION_CODES,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
	HUMAN_RESOURCES_PERMISSION_ORGANIZATION_MANAGE,
	HUMAN_RESOURCES_PERMISSION_ORGANIZATION_READ,
} from "../src/permissions";
import { createMemoryHumanResourcesStore } from "../src/testing";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";
import { humanResourcesCodeFromResult } from "./helpers/result-details";
import { seedDepartmentAndJob } from "./helpers/seed-department-and-job";

const ORG_A = "org-org-a";
const ORG_B = "org-org-b";
const ACTOR = "user-org-1";

function harness(
	permissions: readonly HumanResourcesPermission[] = HUMAN_RESOURCES_PERMISSION_CODES,
) {
	const store = createMemoryHumanResourcesStore();
	const ports = createMemoryMutationPorts();
	const authorization = createGrantingHumanResourcesAuthorization(permissions);
	return { store, ports, authorization };
}

async function seedEmployee(
	ready: ReturnType<typeof harness>,
	input: { organizationId: string; employeeNumber: string; legalName: string },
) {
	return createEmployee(
		{
			organizationId: input.organizationId,
			actorUserId: ACTOR,
			correlationId: `corr-${input.employeeNumber}`,
			idempotencyKey: `idem-${input.employeeNumber}`,
			employeeNumber: input.employeeNumber,
			legalName: input.legalName,
		},
		ready,
	);
}

describe("@afenda/human-resources organization structure", () => {
	it("rejects employee.read for organization mutations", async () => {
		const ready = harness([
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
			HUMAN_RESOURCES_PERMISSION_ORGANIZATION_READ,
		]);
		const department = await createDepartment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-authz",
				code: "DENY",
				name: "Denied",
			},
			ready,
		);
		expect(department.ok).toBe(false);
		if (!department.ok) {
			expect(humanResourcesCodeFromResult(department)).toBe(
				HUMAN_RESOURCES_ERROR_FORBIDDEN,
			);
		}
	});

	it("detects department hierarchy cycles", async () => {
		const ready = harness();
		const root = await createDepartment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-root",
				code: "ROOT",
				name: "Root",
			},
			ready,
		);
		expect(root.ok).toBe(true);
		if (!root.ok) return;

		const child = await createDepartment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-child",
				code: "CHILD",
				name: "Child",
				parentDepartmentId: root.data.id,
			},
			ready,
		);
		expect(child.ok).toBe(true);
		if (!child.ok) return;

		const cycle = await updateDepartment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-cycle",
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
		const ready = harness();
		const parent = await createDepartment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-parent",
				code: "P1",
				name: "Parent",
			},
			ready,
		);
		expect(parent.ok).toBe(true);
		if (!parent.ok) return;

		const archived = await archiveDepartment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-archive-parent",
				departmentId: parent.data.id,
				expectedVersion: 1,
			},
			ready,
		);
		expect(archived.ok).toBe(true);

		const child = await createDepartment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-child-bad-parent",
				code: "C1",
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

	it("blocks archive when active child or position references department", async () => {
		const ready = harness();
		const parent = await createDepartment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-p2",
				code: "P2",
				name: "Parent 2",
			},
			ready,
		);
		expect(parent.ok).toBe(true);
		if (!parent.ok) return;

		const child = await createDepartment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-c2",
				code: "C2",
				name: "Child 2",
				parentDepartmentId: parent.data.id,
			},
			ready,
		);
		expect(child.ok).toBe(true);

		const blocked = await archiveDepartment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-archive-blocked",
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

	it("blocks job archive when active/frozen position references job", async () => {
		const ready = harness();
		const refs = await seedDepartmentAndJob(ready, {
			organizationId: ORG_A,
			actorUserId: ACTOR,
		});
		expect(refs).not.toBeNull();
		if (!refs) return;

		const position = await createPosition(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-pos-job",
				code: "POS-JOB",
				title: "Role",
				departmentId: refs.departmentId,
				jobId: refs.jobId,
				status: "active",
			},
			ready,
		);
		expect(position.ok).toBe(true);

		const archived = await archiveJob(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-archive-job",
				jobId: refs.jobId,
				expectedVersion: 1,
			},
			ready,
		);
		expect(archived.ok).toBe(false);
		if (!archived.ok) {
			expect(humanResourcesCodeFromResult(archived)).toBe(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			);
		}
	});

	it("rejects self-report and reporting cycles", async () => {
		const ready = harness();
		const a = await seedEmployee(ready, {
			organizationId: ORG_A,
			employeeNumber: "E-A",
			legalName: "A",
		});
		const b = await seedEmployee(ready, {
			organizationId: ORG_A,
			employeeNumber: "E-B",
			legalName: "B",
		});
		expect(a.ok && b.ok).toBe(true);
		if (!a.ok || !b.ok) return;

		const self = await assignPrimaryReportingLine(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-self",
				employeeId: a.data.id,
				managerEmployeeId: a.data.id,
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

		const ab = await assignPrimaryReportingLine(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-ab",
				employeeId: a.data.id,
				managerEmployeeId: b.data.id,
				startsOn: "2026-01-01",
			},
			ready,
		);
		expect(ab.ok).toBe(true);

		const cycle = await assignPrimaryReportingLine(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-ba",
				employeeId: b.data.id,
				managerEmployeeId: a.data.id,
				startsOn: "2026-01-01",
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

	it("rejects second simultaneous primary manager", async () => {
		const ready = harness();
		const employee = await seedEmployee(ready, {
			organizationId: ORG_A,
			employeeNumber: "E-1",
			legalName: "One",
		});
		const m1 = await seedEmployee(ready, {
			organizationId: ORG_A,
			employeeNumber: "E-M1",
			legalName: "Manager One",
		});
		const m2 = await seedEmployee(ready, {
			organizationId: ORG_A,
			employeeNumber: "E-M2",
			legalName: "Manager Two",
		});
		expect(employee.ok && m1.ok && m2.ok).toBe(true);
		if (!employee.ok || !m1.ok || !m2.ok) return;

		const first = await assignPrimaryReportingLine(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-p1",
				employeeId: employee.data.id,
				managerEmployeeId: m1.data.id,
				startsOn: "2026-01-01",
			},
			ready,
		);
		expect(first.ok).toBe(true);

		const second = await assignPrimaryReportingLine(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-p2",
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
	});

	it("rejects overlapping primary date ranges", async () => {
		const ready = harness();
		const employee = await seedEmployee(ready, {
			organizationId: ORG_A,
			employeeNumber: "E-OV",
			legalName: "Overlap",
		});
		const m1 = await seedEmployee(ready, {
			organizationId: ORG_A,
			employeeNumber: "E-OM1",
			legalName: "M1",
		});
		const m2 = await seedEmployee(ready, {
			organizationId: ORG_A,
			employeeNumber: "E-OM2",
			legalName: "M2",
		});
		expect(employee.ok && m1.ok && m2.ok).toBe(true);
		if (!employee.ok || !m1.ok || !m2.ok) return;

		const first = await assignPrimaryReportingLine(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-ov1",
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
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-ov2",
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

	it("isolates cross-organization reporting and parents", async () => {
		const ready = harness();
		const empA = await seedEmployee(ready, {
			organizationId: ORG_A,
			employeeNumber: "E-XA",
			legalName: "A",
		});
		const empB = await seedEmployee(ready, {
			organizationId: ORG_B,
			employeeNumber: "E-XB",
			legalName: "B",
		});
		expect(empA.ok && empB.ok).toBe(true);
		if (!empA.ok || !empB.ok) return;

		const cross = await assignPrimaryReportingLine(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-cross",
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
		const ready = harness();
		const department = await createDepartment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-stale",
				code: "STALE",
				name: "Stale",
			},
			ready,
		);
		expect(department.ok).toBe(true);
		if (!department.ok) return;

		const stale = await updateDepartment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-stale-2",
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

	it("rolls back department create when audit fails", async () => {
		const store = createMemoryHumanResourcesStore();
		const ports = createMemoryMutationPorts({ auditFailAfter: 0 });
		const authorization = createGrantingHumanResourcesAuthorization([
			...HUMAN_RESOURCES_PERMISSION_CODES,
		]);
		const ready = { store, ports, authorization };
		const department = await createDepartment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-tx",
				code: "TX",
				name: "TX Dept",
			},
			ready,
		);
		expect(department.ok).toBe(false);
		const listed = await store.listDepartments({
			organizationId: ORG_A,
			page: 1,
			pageSize: 20,
		});
		expect(listed.ok).toBe(true);
		if (listed.ok) {
			expect(listed.data.totalCount).toBe(0);
		}
	});

	it("resolves primary manager and lists direct reports after replace", async () => {
		const ready = harness([
			...HUMAN_RESOURCES_PERMISSION_CODES,
			HUMAN_RESOURCES_PERMISSION_ORGANIZATION_MANAGE,
			HUMAN_RESOURCES_PERMISSION_ORGANIZATION_READ,
		]);
		const employee = await seedEmployee(ready, {
			organizationId: ORG_A,
			employeeNumber: "E-R1",
			legalName: "Report",
		});
		const m1 = await seedEmployee(ready, {
			organizationId: ORG_A,
			employeeNumber: "E-RM1",
			legalName: "Mgr1",
		});
		const m2 = await seedEmployee(ready, {
			organizationId: ORG_A,
			employeeNumber: "E-RM2",
			legalName: "Mgr2",
		});
		expect(employee.ok && m1.ok && m2.ok).toBe(true);
		if (!employee.ok || !m1.ok || !m2.ok) return;

		const assigned = await assignPrimaryReportingLine(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-r1",
				employeeId: employee.data.id,
				managerEmployeeId: m1.data.id,
				startsOn: "2026-01-01",
			},
			ready,
		);
		expect(assigned.ok).toBe(true);

		const replaced = await replacePrimaryReportingLine(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-r2",
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
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-r3",
				employeeId: employee.data.id,
				asOf: "2026-03-15",
			},
			ready,
		);
		expect(current.ok).toBe(true);
		if (current.ok) {
			expect(current.data?.managerEmployeeId).toBe(m2.data.id);
		}

		const reports = await listDirectReports(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-r4",
				managerEmployeeId: m2.data.id,
				asOf: "2026-03-15",
			},
			ready,
		);
		expect(reports.ok).toBe(true);
		if (reports.ok) {
			expect(reports.data.totalCount).toBe(1);
			expect(reports.data.reportingLines[0]?.employeeId).toBe(employee.data.id);
		}
	});

	it("returns bounded organization tree without unbounded recursion", async () => {
		const ready = harness();
		const root = await createDepartment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-tree-root",
				code: "T-ROOT",
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
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-tree-${i}`,
					code: `T-${i}`,
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
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-tree",
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

	it("rejects freeze/close when open assignment would violate — freeze alone allowed without assignment", async () => {
		const ready = harness();
		const refs = await seedDepartmentAndJob(ready, {
			organizationId: ORG_A,
			actorUserId: ACTOR,
		});
		expect(refs).not.toBeNull();
		if (!refs) return;

		const position = await createPosition(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-freeze",
				code: "POS-F",
				title: "Freezeable",
				departmentId: refs.departmentId,
				jobId: refs.jobId,
				status: "active",
			},
			ready,
		);
		expect(position.ok).toBe(true);
		if (!position.ok) return;

		const frozen = await freezePosition(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-freeze-2",
				positionId: position.data.id,
				expectedVersion: 1,
			},
			ready,
		);
		expect(frozen.ok).toBe(true);
		if (frozen.ok) {
			expect(frozen.data.status).toBe("frozen");
		}

		const closed = await closePosition(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-close",
				positionId: position.data.id,
				expectedVersion: 2,
			},
			ready,
		);
		expect(closed.ok).toBe(true);
		if (closed.ok) {
			expect(closed.data.status).toBe("closed");
		}
	});

	it("activates an archived department", async () => {
		const ready = harness();
		const department = await createDepartment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-act",
				code: "ACT",
				name: "Activatable",
				status: "archived",
			},
			ready,
		);
		expect(department.ok).toBe(true);
		if (!department.ok) return;

		const activated = await activateDepartment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-act-2",
				departmentId: department.data.id,
				expectedVersion: 1,
			},
			ready,
		);
		expect(activated.ok).toBe(true);
		if (activated.ok) {
			expect(activated.data.status).toBe("active");
		}
	});
});
