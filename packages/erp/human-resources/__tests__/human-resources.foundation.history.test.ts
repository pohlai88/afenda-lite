/**
 * Slice 4.2 — person identity and worker classification historical truth.
 */

import { afterAll, describe, expect, it } from "vitest";
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
import { runDrizzleParity } from "./helpers/database-gate";
import {
	createHrParityHarness,
	type WorkforceStoreAdapter,
} from "./helpers/hr-parity-harness";
import { createNeonOrgTracker } from "./helpers/neon-cleanup";

function nextIsoDate(value: string): string {
	const date = new Date(`${value}T00:00:00.000Z`);
	date.setUTCDate(date.getUTCDate() + 1);
	return date.toISOString().slice(0, 10);
}

function defineFoundationHistorySuite(adapter: WorkforceStoreAdapter): void {
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
		if (!person.ok) return;

		const rootVersions = await ready.store.listPersonIdentityVersions({
			organizationId: ORG,
			personId: person.data.id,
		});
		expect(rootVersions.ok).toBe(true);
		if (!rootVersions.ok) return;
		const openRoot = rootVersions.data.find(
			(version) => version.effectiveTo === null,
		);
		expect(openRoot).toBeDefined();
		if (openRoot === undefined) return;

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
		expect(renamed.ok).toBe(true);
		if (!renamed.ok) return;

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
		if (!beforeCorrection.ok) return;
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
		if (!onBoundary.ok) return;
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
		if (!afterCorrection.ok) return;
		expect(afterCorrection.data.legalName).toBe("Corrected Name");

		const lineage = await ready.store.listPersonIdentityVersions({
			organizationId: ORG,
			personId: person.data.id,
		});
		expect(lineage.ok).toBe(true);
		if (!lineage.ok) return;
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
		if (!person.ok) return;

		const versions = await ready.store.listPersonIdentityVersions({
			organizationId: ORG,
			personId: person.data.id,
		});
		expect(versions.ok).toBe(true);
		if (!versions.ok) return;
		const open = versions.data.find((version) => version.effectiveTo === null);
		expect(open).toBeDefined();
		if (open === undefined) return;

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
		if (conflict.ok) return;
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
		if (!person.ok) return;

		const worker = await createWorker(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-worker-create-${suffix}`,
				idempotencyKey: `idem-worker-create-${suffix}`,
				personId: person.data.id,
				workerType: "contractor",
				effectiveFrom: "2026-01-01",
			},
			ready,
		);
		expect(worker.ok).toBe(true);
		if (!worker.ok) return;

		const retyped = await changeWorkerType(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-worker-type-${suffix}`,
				workerId: worker.data.id,
				workerType: "intern",
				employeeId: null,
				effectiveOn: "2026-02-01",
				reasonCode: "reclassification",
				expectedVersion: worker.data.version,
			},
			ready,
		);
		expect(retyped.ok).toBe(true);
		if (!retyped.ok) return;
		expect(retyped.data.workerType).toBe("intern");

		const statusChanged = await changeWorkerStatus(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-worker-status-${suffix}`,
				workerId: retyped.data.id,
				status: "inactive",
				effectiveOn: "2026-03-01",
				reasonCode: "status_change",
				expectedVersion: retyped.data.version,
			},
			ready,
		);
		expect(statusChanged.ok).toBe(true);
		if (!statusChanged.ok) return;
		expect(statusChanged.data.status).toBe("inactive");

		const lineage = await ready.store.listWorkerClassificationVersions({
			organizationId: ORG,
			workerId: worker.data.id,
		});
		expect(lineage.ok).toBe(true);
		if (!lineage.ok) return;
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
				asOf: "2026-01-15",
			},
			ready,
		);
		expect(contractorAsOf.ok).toBe(true);
		if (!contractorAsOf.ok) return;
		expect(contractorAsOf.data.workerType).toBe("contractor");
		expect(contractorAsOf.data.status).toBe("active");

		const internActiveAsOf = await getWorkerAsOf(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-worker-asof-intern-${suffix}`,
				workerId: worker.data.id,
				asOf: "2026-02-15",
			},
			ready,
		);
		expect(internActiveAsOf.ok).toBe(true);
		if (!internActiveAsOf.ok) return;
		expect(internActiveAsOf.data.workerType).toBe("intern");
		expect(internActiveAsOf.data.status).toBe("active");

		const inactiveAsOf = await getWorkerAsOf(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-worker-asof-inactive-${suffix}`,
				workerId: worker.data.id,
				asOf: "2026-03-01",
			},
			ready,
		);
		expect(inactiveAsOf.ok).toBe(true);
		if (!inactiveAsOf.ok) return;
		expect(inactiveAsOf.data.status).toBe("inactive");
	});
}

describe("@afenda/human-resources foundation history (memory)", () => {
	defineFoundationHistorySuite("memory");
});

describe.runIf(runDrizzleParity)(
	"@afenda/human-resources foundation history (drizzle parity)",
	() => {
		defineFoundationHistorySuite("drizzle");
	},
);
