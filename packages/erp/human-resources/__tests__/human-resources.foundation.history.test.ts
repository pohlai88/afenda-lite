/**
 * Slice 4.2 — person identity and worker classification historical truth.
 */

import { afterAll, describe, expect, it } from "vitest";
import { createEmployee } from "../src/core/employee";
import { previousIsoDate } from "../src/shared/effective-dates";
import {
	createPerson,
	getPersonAsOf,
	updatePersonName,
} from "../src/workforce-foundation/person";
import {
	changeWorkerStatus,
	changeWorkerType,
	createWorker,
	getWorkerAsOf,
} from "../src/workforce-foundation/worker";
import {
	createHrParityHarness,
	type WorkforceStoreAdapter,
} from "./helpers/hr-parity-harness";
import { createNeonOrgTracker } from "./helpers/neon-cleanup";
import { resultFailureMessage } from "./helpers/result-details";

function nextIsoDate(value: string): string {
	const date = new Date(`${value}T00:00:00.000Z`);
	date.setUTCDate(date.getUTCDate() + 1);
	return date.toISOString().slice(0, 10);
}

// biome-ignore lint/suspicious/noExportsInTest: The parity wrapper reuses the exact same behavioral suite against the Drizzle adapter.
export function defineFoundationHistorySuite(
	adapter: WorkforceStoreAdapter,
): void {
	const suffix = `${adapter}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const neonOrgs = createNeonOrgTracker();
	const ORG = neonOrgs.trackOrg(`org-hr-foundation-history-${suffix}`);
	const ACTOR = `user-hr-foundation-history-${suffix}`;

	afterAll(async () => {
		if (adapter === "drizzle") {
			await neonOrgs.cleanup();
		}
	});

	it("preserves prior legal name via identity correction lineage and as-of queries", async () => {
		const ready = createHrParityHarness(adapter);
		const person = await createPerson(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-person-history-${suffix}`,
				idempotencyKey: `idem-person-history-${suffix}`,
				legalName: "Original Name",
			},
			ready,
		);
		expect(person.ok).toBe(true);
		if (!person.ok) {
			return;
		}

		const rootVersions = await ready.store.listPersonIdentityVersions({
			organizationId: ORG,
			personId: person.data.id,
		});
		expect(rootVersions.ok).toBe(true);
		if (!rootVersions.ok) {
			return;
		}
		const openRoot = rootVersions.data.find(
			(version) => version.effectiveTo === null,
		);
		expect(openRoot).toBeDefined();
		if (openRoot === undefined) {
			return;
		}

		const correctionEffectiveOn = nextIsoDate(openRoot.effectiveFrom);
		const renamed = await updatePersonName(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-person-rename-${suffix}`,
				personId: person.data.id,
				legalName: "Corrected Name",
				effectiveOn: correctionEffectiveOn,
				reasonCode: "legal_name_correction",
				expectedVersion: person.data.version,
			},
			ready,
		);
		expect(renamed.ok, resultFailureMessage(renamed)).toBe(true);
		if (!renamed.ok) {
			return;
		}

		const beforeCorrection = await getPersonAsOf(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-person-asof-before-${suffix}`,
				personId: person.data.id,
				asOf: openRoot.effectiveFrom,
			},
			ready,
		);
		expect(beforeCorrection.ok).toBe(true);
		if (!beforeCorrection.ok) {
			return;
		}
		expect(beforeCorrection.data.legalName).toBe("Original Name");

		const onBoundary = await getPersonAsOf(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-person-asof-boundary-${suffix}`,
				personId: person.data.id,
				asOf: previousIsoDate(correctionEffectiveOn),
			},
			ready,
		);
		expect(onBoundary.ok).toBe(true);
		if (!onBoundary.ok) {
			return;
		}
		expect(onBoundary.data.legalName).toBe("Original Name");

		const afterCorrection = await getPersonAsOf(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-person-asof-after-${suffix}`,
				personId: person.data.id,
				asOf: correctionEffectiveOn,
			},
			ready,
		);
		expect(afterCorrection.ok).toBe(true);
		if (!afterCorrection.ok) {
			return;
		}
		expect(afterCorrection.data.legalName).toBe("Corrected Name");

		const lineage = await ready.store.listPersonIdentityVersions({
			organizationId: ORG,
			personId: person.data.id,
		});
		expect(lineage.ok).toBe(true);
		if (!lineage.ok) {
			return;
		}
		expect(lineage.data).toHaveLength(2);
		const predecessor = lineage.data.find(
			(version) => version.lineageStatus === "superseded",
		);
		expect(predecessor?.legalName).toBe("Original Name");
		expect(predecessor?.effectiveTo).toBe(
			previousIsoDate(correctionEffectiveOn),
		);
	});

	it("rejects optimistic-lock conflicts on person identity correction", async () => {
		const ready = createHrParityHarness(adapter);
		const person = await createPerson(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-person-conflict-${suffix}`,
				idempotencyKey: `idem-person-conflict-${suffix}`,
				legalName: "Conflict Name",
			},
			ready,
		);
		expect(person.ok).toBe(true);
		if (!person.ok) {
			return;
		}

		const versions = await ready.store.listPersonIdentityVersions({
			organizationId: ORG,
			personId: person.data.id,
		});
		expect(versions.ok).toBe(true);
		if (!versions.ok) {
			return;
		}
		const open = versions.data.find((version) => version.effectiveTo === null);
		expect(open).toBeDefined();
		if (open === undefined) {
			return;
		}

		const conflict = await updatePersonName(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-person-conflict-update-${suffix}`,
				personId: person.data.id,
				legalName: "Stale Version",
				effectiveOn: nextIsoDate(open.effectiveFrom),
				reasonCode: "legal_name_correction",
				expectedVersion: person.data.version + 99,
			},
			ready,
		);
		expect(conflict.ok).toBe(false);
		if (conflict.ok) {
			return;
		}
		expect(conflict.code).toBe("CONFLICT");
	});

	it("chains worker type and status changes in one classification lineage", async () => {
		const ready = createHrParityHarness(adapter);
		const person = await createPerson(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-worker-person-${suffix}`,
				idempotencyKey: `idem-worker-person-${suffix}`,
				legalName: "Worker Person",
			},
			ready,
		);
		expect(person.ok).toBe(true);
		if (!person.ok) {
			return;
		}

		const worker = await createWorker(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-worker-create-${suffix}`,
				idempotencyKey: `idem-worker-create-${suffix}`,
				personId: person.data.id,
				workerType: "contractor",
				effectiveFrom: "2099-01-01",
			},
			ready,
		);
		expect(worker.ok).toBe(true);
		if (!worker.ok) {
			return;
		}

		const retyped = await changeWorkerType(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-worker-type-${suffix}`,
				workerId: worker.data.id,
				workerType: "intern",
				employeeId: null,
				effectiveOn: "2099-02-01",
				reasonCode: "reclassification",
				expectedVersion: worker.data.version,
			},
			ready,
		);
		expect(retyped.ok).toBe(true);
		if (!retyped.ok) {
			return;
		}
		expect(retyped.data.workerType).toBe("intern");

		const statusChanged = await changeWorkerStatus(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-worker-status-${suffix}`,
				workerId: retyped.data.id,
				status: "inactive",
				effectiveOn: "2099-03-01",
				reasonCode: "status_change",
				expectedVersion: retyped.data.version,
			},
			ready,
		);
		expect(statusChanged.ok).toBe(true);
		if (!statusChanged.ok) {
			return;
		}
		expect(statusChanged.data.status).toBe("inactive");

		const lineage = await ready.store.listWorkerClassificationVersions({
			organizationId: ORG,
			workerId: worker.data.id,
		});
		expect(lineage.ok).toBe(true);
		if (!lineage.ok) {
			return;
		}
		expect(lineage.data).toHaveLength(3);

		const sorted = [...lineage.data].sort((left, right) =>
			left.effectiveFrom.localeCompare(right.effectiveFrom),
		);
		expect(sorted[0]?.workerType).toBe("contractor");
		expect(sorted[0]?.workerStatus).toBe("active");
		expect(sorted[0]?.supersedesClassificationVersionId).toBeNull();
		expect(sorted[1]?.workerType).toBe("intern");
		expect(sorted[1]?.workerStatus).toBe("active");
		expect(sorted[1]?.supersedesClassificationVersionId).toBe(sorted[0]?.id);
		expect(sorted[2]?.workerType).toBe("intern");
		expect(sorted[2]?.workerStatus).toBe("inactive");
		expect(sorted[2]?.supersedesClassificationVersionId).toBe(sorted[1]?.id);
		expect(sorted[2]?.effectiveTo).toBeNull();

		const contractorAsOf = await getWorkerAsOf(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-worker-asof-contractor-${suffix}`,
				workerId: worker.data.id,
				asOf: "2099-01-15",
			},
			ready,
		);
		expect(contractorAsOf.ok).toBe(true);
		if (!contractorAsOf.ok) {
			return;
		}
		expect(contractorAsOf.data.workerType).toBe("contractor");
		expect(contractorAsOf.data.status).toBe("active");

		const internActiveAsOf = await getWorkerAsOf(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-worker-asof-intern-${suffix}`,
				workerId: worker.data.id,
				asOf: "2099-02-15",
			},
			ready,
		);
		expect(internActiveAsOf.ok).toBe(true);
		if (!internActiveAsOf.ok) {
			return;
		}
		expect(internActiveAsOf.data.workerType).toBe("intern");
		expect(internActiveAsOf.data.status).toBe("active");

		const inactiveAsOf = await getWorkerAsOf(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-worker-asof-inactive-${suffix}`,
				workerId: worker.data.id,
				asOf: "2099-03-01",
			},
			ready,
		);
		expect(inactiveAsOf.ok).toBe(true);
		if (!inactiveAsOf.ok) {
			return;
		}
		expect(inactiveAsOf.data.status).toBe("inactive");
	});

	it("replays worker create idempotently and rejects fingerprint reuse", async () => {
		const ready = createHrParityHarness(adapter);
		const person = await createPerson(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-worker-idem-person-${suffix}`,
				idempotencyKey: `idem-worker-idem-person-${suffix}`,
				legalName: "Idempotent Worker Person",
			},
			ready,
		);
		expect(person.ok).toBe(true);
		if (!person.ok) {
			return;
		}

		const createInput = {
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: `corr-worker-idem-create-${suffix}`,
			idempotencyKey: `idem-worker-idem-create-${suffix}`,
			personId: person.data.id,
			workerType: "contractor" as const,
			effectiveFrom: "2099-01-01",
		};
		const first = await createWorker(createInput, ready);
		expect(first.ok).toBe(true);
		if (!first.ok) {
			return;
		}

		const replay = await createWorker(createInput, ready);
		expect(replay.ok).toBe(true);
		if (!replay.ok) {
			return;
		}
		expect(replay.data.id).toBe(first.data.id);

		const conflict = await createWorker(
			{
				...createInput,
				correlationId: `corr-worker-idem-conflict-${suffix}`,
				workerType: "intern",
			},
			ready,
		);
		expect(conflict.ok).toBe(false);
		if (conflict.ok) {
			return;
		}
		expect(conflict.code).toBe("CONFLICT");
	});

	it("rejects duplicate worker linkage for the same person", async () => {
		const ready = createHrParityHarness(adapter);
		const person = await createPerson(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-worker-dup-person-${suffix}`,
				idempotencyKey: `idem-worker-dup-person-${suffix}`,
				legalName: "Duplicate Worker Person",
			},
			ready,
		);
		expect(person.ok).toBe(true);
		if (!person.ok) {
			return;
		}

		const first = await createWorker(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-worker-dup-first-${suffix}`,
				idempotencyKey: `idem-worker-dup-first-${suffix}`,
				personId: person.data.id,
				workerType: "contractor",
				effectiveFrom: "2099-01-01",
			},
			ready,
		);
		expect(first.ok).toBe(true);
		if (!first.ok) {
			return;
		}

		const duplicate = await createWorker(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-worker-dup-second-${suffix}`,
				idempotencyKey: `idem-worker-dup-second-${suffix}`,
				personId: person.data.id,
				workerType: "intern",
				effectiveFrom: "2099-02-01",
			},
			ready,
		);
		expect(duplicate.ok).toBe(false);
		if (duplicate.ok) {
			return;
		}
		expect(duplicate.code).toBe("CONFLICT");
	});

	it("rejects worker create when the person does not exist", async () => {
		const ready = createHrParityHarness(adapter);
		const missingPerson = await createWorker(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-worker-missing-person-${suffix}`,
				idempotencyKey: `idem-worker-missing-person-${suffix}`,
				personId: "10000000-0000-4000-8000-000000000099",
				workerType: "contractor",
				effectiveFrom: "2099-01-01",
			},
			ready,
		);
		expect(missingPerson.ok).toBe(false);
		if (missingPerson.ok) {
			return;
		}
		expect(missingPerson.code).toBe("NOT_FOUND");
	});

	it("supports contingent worker create, reclassification, and as-of resolution", async () => {
		const ready = createHrParityHarness(adapter);
		const person = await createPerson(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-contingent-person-${suffix}`,
				idempotencyKey: `idem-contingent-person-${suffix}`,
				legalName: "Contingent Worker Person",
			},
			ready,
		);
		expect(person.ok).toBe(true);
		if (!person.ok) {
			return;
		}

		const worker = await createWorker(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-contingent-create-${suffix}`,
				idempotencyKey: `idem-contingent-create-${suffix}`,
				personId: person.data.id,
				workerType: "contingent_worker",
				effectiveFrom: "2099-01-01",
			},
			ready,
		);
		expect(worker.ok).toBe(true);
		if (!worker.ok) {
			return;
		}
		expect(worker.data.workerType).toBe("contingent_worker");
		expect(worker.data.employeeId).toBeNull();

		const retyped = await changeWorkerType(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-contingent-type-${suffix}`,
				workerId: worker.data.id,
				workerType: "contractor",
				employeeId: null,
				effectiveOn: "2099-02-01",
				reasonCode: "reclassification",
				expectedVersion: worker.data.version,
			},
			ready,
		);
		expect(retyped.ok).toBe(true);
		if (!retyped.ok) {
			return;
		}
		expect(retyped.data.workerType).toBe("contractor");

		const contingentAsOf = await getWorkerAsOf(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-contingent-asof-${suffix}`,
				workerId: worker.data.id,
				asOf: "2099-01-15",
			},
			ready,
		);
		expect(contingentAsOf.ok).toBe(true);
		if (!contingentAsOf.ok) {
			return;
		}
		expect(contingentAsOf.data.workerType).toBe("contingent_worker");

		const contractorAsOf = await getWorkerAsOf(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-contingent-asof-contractor-${suffix}`,
				workerId: worker.data.id,
				asOf: "2099-02-15",
			},
			ready,
		);
		expect(contractorAsOf.ok).toBe(true);
		if (!contractorAsOf.ok) {
			return;
		}
		expect(contractorAsOf.data.workerType).toBe("contractor");
	});

	it("enforces employee linkage rules and duplicate employee conflicts", async () => {
		const ready = createHrParityHarness(adapter);
		const person = await createPerson(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-employee-link-person-${suffix}`,
				idempotencyKey: `idem-employee-link-person-${suffix}`,
				legalName: "Employee Link Person",
			},
			ready,
		);
		expect(person.ok).toBe(true);
		if (!person.ok) {
			return;
		}

		const employee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-employee-link-emp-${suffix}`,
				idempotencyKey: `idem-employee-link-emp-${suffix}`,
				employeeNumber: `EL-${suffix}`,
				legalName: "Employee Link Target",
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) {
			return;
		}

		const worker = await createWorker(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-employee-link-worker-${suffix}`,
				idempotencyKey: `idem-employee-link-worker-${suffix}`,
				personId: person.data.id,
				workerType: "employee",
				employeeId: employee.data.id,
				effectiveFrom: "2099-01-01",
			},
			ready,
		);
		expect(worker.ok).toBe(true);
		if (!worker.ok) {
			return;
		}
		expect(worker.data.workerType).toBe("employee");
		if (worker.data.workerType !== "employee") {
			return;
		}
		expect(worker.data.employeeId).toBe(employee.data.id);

		const otherPerson = await createPerson(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-employee-link-other-person-${suffix}`,
				idempotencyKey: `idem-employee-link-other-person-${suffix}`,
				legalName: "Other Employee Link Person",
			},
			ready,
		);
		expect(otherPerson.ok).toBe(true);
		if (!otherPerson.ok) {
			return;
		}

		const duplicateEmployeeLink = await createWorker(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-employee-link-dup-${suffix}`,
				idempotencyKey: `idem-employee-link-dup-${suffix}`,
				personId: otherPerson.data.id,
				workerType: "employee",
				employeeId: employee.data.id,
				effectiveFrom: "2099-01-01",
			},
			ready,
		);
		expect(duplicateEmployeeLink.ok).toBe(false);
		if (duplicateEmployeeLink.ok) {
			return;
		}
		expect(duplicateEmployeeLink.code).toBe("CONFLICT");

		const unlinked = await changeWorkerType(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-employee-link-unlink-${suffix}`,
				workerId: worker.data.id,
				workerType: "contractor",
				employeeId: null,
				effectiveOn: "2099-03-01",
				reasonCode: "reclassification",
				expectedVersion: worker.data.version,
			},
			ready,
		);
		expect(unlinked.ok).toBe(true);
		if (!unlinked.ok) {
			return;
		}
		expect(unlinked.data.workerType).toBe("contractor");
		expect(unlinked.data.employeeId).toBeNull();
	});

	it("rejects optimistic-lock and no-op worker classification changes", async () => {
		const ready = createHrParityHarness(adapter);
		const person = await createPerson(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-worker-conflict-person-${suffix}`,
				idempotencyKey: `idem-worker-conflict-person-${suffix}`,
				legalName: "Worker Conflict Person",
			},
			ready,
		);
		expect(person.ok).toBe(true);
		if (!person.ok) {
			return;
		}

		const worker = await createWorker(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-worker-conflict-create-${suffix}`,
				idempotencyKey: `idem-worker-conflict-create-${suffix}`,
				personId: person.data.id,
				workerType: "contractor",
				effectiveFrom: "2099-01-01",
			},
			ready,
		);
		expect(worker.ok).toBe(true);
		if (!worker.ok) {
			return;
		}

		const staleType = await changeWorkerType(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-worker-conflict-type-${suffix}`,
				workerId: worker.data.id,
				workerType: "intern",
				employeeId: null,
				effectiveOn: "2099-02-01",
				reasonCode: "reclassification",
				expectedVersion: worker.data.version + 99,
			},
			ready,
		);
		expect(staleType.ok).toBe(false);
		if (staleType.ok) {
			return;
		}
		expect(staleType.code).toBe("CONFLICT");

		const noOpType = await changeWorkerType(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-worker-noop-type-${suffix}`,
				workerId: worker.data.id,
				workerType: "contractor",
				employeeId: null,
				effectiveOn: "2099-02-01",
				reasonCode: "reclassification",
				expectedVersion: worker.data.version,
			},
			ready,
		);
		expect(noOpType.ok).toBe(false);
		if (noOpType.ok) {
			return;
		}
		expect(noOpType.code).toBe("CONFLICT");

		const statusChanged = await changeWorkerStatus(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-worker-former-${suffix}`,
				workerId: worker.data.id,
				status: "former",
				effectiveOn: "2099-03-01",
				reasonCode: "status_change",
				expectedVersion: worker.data.version,
			},
			ready,
		);
		expect(statusChanged.ok).toBe(true);
		if (!statusChanged.ok) {
			return;
		}
		expect(statusChanged.data.status).toBe("former");

		const staleStatus = await changeWorkerStatus(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-worker-conflict-status-${suffix}`,
				workerId: statusChanged.data.id,
				status: "inactive",
				effectiveOn: "2099-04-01",
				reasonCode: "status_change",
				expectedVersion: worker.data.version,
			},
			ready,
		);
		expect(staleStatus.ok).toBe(false);
		if (staleStatus.ok) {
			return;
		}
		expect(staleStatus.code).toBe("CONFLICT");

		const noOpStatus = await changeWorkerStatus(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-worker-noop-status-${suffix}`,
				workerId: statusChanged.data.id,
				status: "former",
				effectiveOn: "2099-04-01",
				reasonCode: "status_change",
				expectedVersion: statusChanged.data.version,
			},
			ready,
		);
		expect(noOpStatus.ok).toBe(false);
		if (noOpStatus.ok) {
			return;
		}
		expect(noOpStatus.code).toBe("CONFLICT");
	});

	it("resolves worker as-of on classification boundary dates", async () => {
		const ready = createHrParityHarness(adapter);
		const person = await createPerson(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-worker-boundary-person-${suffix}`,
				idempotencyKey: `idem-worker-boundary-person-${suffix}`,
				legalName: "Worker Boundary Person",
			},
			ready,
		);
		expect(person.ok).toBe(true);
		if (!person.ok) {
			return;
		}

		const worker = await createWorker(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-worker-boundary-create-${suffix}`,
				idempotencyKey: `idem-worker-boundary-create-${suffix}`,
				personId: person.data.id,
				workerType: "contractor",
				effectiveFrom: "2099-01-01",
			},
			ready,
		);
		expect(worker.ok).toBe(true);
		if (!worker.ok) {
			return;
		}

		const retyped = await changeWorkerType(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-worker-boundary-type-${suffix}`,
				workerId: worker.data.id,
				workerType: "intern",
				employeeId: null,
				effectiveOn: "2099-02-01",
				reasonCode: "reclassification",
				expectedVersion: worker.data.version,
			},
			ready,
		);
		expect(retyped.ok).toBe(true);
		if (!retyped.ok) {
			return;
		}

		const dayBefore = await getWorkerAsOf(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-worker-boundary-before-${suffix}`,
				workerId: worker.data.id,
				asOf: previousIsoDate("2099-02-01"),
			},
			ready,
		);
		expect(dayBefore.ok).toBe(true);
		if (!dayBefore.ok) {
			return;
		}
		expect(dayBefore.data.workerType).toBe("contractor");

		const dayOf = await getWorkerAsOf(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-worker-boundary-on-${suffix}`,
				workerId: worker.data.id,
				asOf: "2099-02-01",
			},
			ready,
		);
		expect(dayOf.ok).toBe(true);
		if (!dayOf.ok) {
			return;
		}
		expect(dayOf.data.workerType).toBe("intern");

		const dayAfter = await getWorkerAsOf(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-worker-boundary-after-${suffix}`,
				workerId: worker.data.id,
				asOf: "2099-02-02",
			},
			ready,
		);
		expect(dayAfter.ok).toBe(true);
		if (!dayAfter.ok) {
			return;
		}
		expect(dayAfter.data.workerType).toBe("intern");
	});
}

describe("@afenda/human-resources foundation history (memory)", () => {
	defineFoundationHistorySuite("memory");
});
