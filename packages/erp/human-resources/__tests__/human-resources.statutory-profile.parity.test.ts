/** Memory vs Drizzle parity for D0 statutory-fact capture (HR-STATUTORY-01). */

import { afterAll, describe, expect, it } from "vitest";
import { restrictEmployeeData } from "../src/features/privacy/operations";
import {
	listPriorEmployerYtd,
	recordPriorEmployerYtd,
} from "../src/features/statutory-profile/prior-employer-ytd";
import {
	getStatutoryProfile,
	listStatutoryProfiles,
	upsertStatutoryProfile,
} from "../src/features/statutory-profile/statutory-profile";
import { createEmployee } from "../src/features/workforce-records/employment/employee";
import type { HumanResourcesCommandOptions } from "../src/kernel/execution/command-options";
import { runDrizzleParity } from "./helpers/database-gate";
import {
	createHrParityHarness,
	type WorkforceStoreAdapter,
} from "./helpers/hr-parity-harness";
import { createNeonOrgTracker } from "./helpers/neon-cleanup";
import { createHumanResourcesTestPrivacyPort } from "./helpers/privacy-options";

function uniqueSuffix(adapter: WorkforceStoreAdapter): string {
	return `${adapter}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * The statutory feature is fail-closed on the privacy capability, so every
 * parity harness composes a privacy port exactly like the production
 * composition root does.
 */
function statutoryHarness(
	adapter: WorkforceStoreAdapter,
): HumanResourcesCommandOptions {
	return {
		...createHrParityHarness(adapter),
		privacy: createHumanResourcesTestPrivacyPort(),
	};
}

async function seedEmployee(
	ready: HumanResourcesCommandOptions,
	input: { organizationId: string; actorUserId: string; suffix: string },
) {
	const employee = await createEmployee(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-emp-${input.suffix}`,
			idempotencyKey: `idem-emp-${input.suffix}`,
			employeeNumber: `E-${input.suffix}`.slice(0, 64),
			legalName: `Statutory Worker ${input.suffix}`,
		},
		ready,
	);
	if (!employee.ok) {
		throw new Error(`Failed to seed employee: ${employee.code}`);
	}
	return employee.data;
}

function upsertPayload(input: {
	organizationId: string;
	actorUserId: string;
	employeeId: string;
	tag: string;
	effectiveFrom: string;
	taxResidencyStatus?: "resident" | "non_resident";
	jurisdictionCode?: "MY" | "VN";
	minimumWageZone?: "I" | "II" | "III" | "IV" | null;
}) {
	return {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: `corr-${input.tag}`,
		idempotencyKey: `idem-${input.tag}`,
		employeeId: input.employeeId,
		jurisdictionCode: input.jurisdictionCode ?? "MY",
		taxResidencyStatus: input.taxResidencyStatus ?? "resident",
		nationalityCountryCode: "MY",
		expatriate: false,
		minimumWageZone: input.minimumWageZone ?? null,
		taxFileNumber: `SG-${input.tag}`.slice(0, 64),
		employeeProvidentFundNumber: "EPF-99887766",
		socialSecurityNumber: "SOCSO-556677",
		socialInsuranceBookNumber: null,
		dependantCount: 2,
		reliefDeclarations: [
			{ reliefCode: "self" as const },
			{ reliefCode: "child" as const, dependantReference: "child-1" },
		],
		effectiveFrom: input.effectiveFrom,
	};
}

function defineStatutoryProfileParitySuite(
	adapter: WorkforceStoreAdapter,
): void {
	const suffix = uniqueSuffix(adapter);
	const neonOrgs = createNeonOrgTracker();
	const organizationId = neonOrgs.trackOrg(`org-statutory-parity-${suffix}`);
	const actorUserId = `actor-${suffix}`;

	afterAll(async () => {
		if (adapter === "drizzle") {
			await neonOrgs.cleanup();
		}
	});

	it("captures an effective-dated profile and supersedes the open segment", async () => {
		const ready = statutoryHarness(adapter);
		const employee = await seedEmployee(ready, {
			organizationId,
			actorUserId,
			suffix: `supersede-${suffix}`,
		});

		const first = await upsertStatutoryProfile(
			upsertPayload({
				organizationId,
				actorUserId,
				employeeId: employee.id,
				tag: `supersede-1-${suffix}`,
				effectiveFrom: "2026-01-01",
			}),
			ready,
		);
		expect(first.ok).toBe(true);
		if (!first.ok) {
			return;
		}
		expect(first.data.status).toBe("active");
		expect(first.data.effectiveTo).toBeNull();
		expect(first.data.supersedesStatutoryProfileId).toBeNull();
		expect(first.data.reliefDeclarationVersion).toBe("hr.statutory-relief.v1");
		expect(first.data.reliefDeclarations).toHaveLength(2);

		const second = await upsertStatutoryProfile(
			upsertPayload({
				organizationId,
				actorUserId,
				employeeId: employee.id,
				tag: `supersede-2-${suffix}`,
				effectiveFrom: "2026-07-01",
				taxResidencyStatus: "non_resident",
				jurisdictionCode: "VN",
				minimumWageZone: "II",
			}),
			ready,
		);
		expect(second.ok).toBe(true);
		if (!second.ok) {
			return;
		}
		expect(second.data.supersedesStatutoryProfileId).toBe(first.data.id);
		expect(second.data.taxResidencyStatus).toBe("non_resident");
		expect(second.data.minimumWageZone).toBe("II");

		const historical = await getStatutoryProfile(
			{
				organizationId,
				actorUserId,
				correlationId: `corr-hist-${suffix}`,
				employeeId: employee.id,
				asOf: "2026-03-01",
			},
			ready,
		);
		expect(historical.ok).toBe(true);
		if (!historical.ok) {
			return;
		}
		expect(historical.data?.id).toBe(first.data.id);
		expect(historical.data?.status).toBe("superseded");
		expect(historical.data?.effectiveTo).toBe("2026-06-30");

		const current = await getStatutoryProfile(
			{
				organizationId,
				actorUserId,
				correlationId: `corr-current-${suffix}`,
				employeeId: employee.id,
				asOf: "2026-08-01",
			},
			ready,
		);
		expect(current.ok).toBe(true);
		if (!current.ok) {
			return;
		}
		expect(current.data?.id).toBe(second.data.id);
	});

	it("refuses a segment that does not advance the open effective date", async () => {
		const ready = statutoryHarness(adapter);
		const employee = await seedEmployee(ready, {
			organizationId,
			actorUserId,
			suffix: `backdate-${suffix}`,
		});

		const first = await upsertStatutoryProfile(
			upsertPayload({
				organizationId,
				actorUserId,
				employeeId: employee.id,
				tag: `backdate-1-${suffix}`,
				effectiveFrom: "2026-05-01",
			}),
			ready,
		);
		expect(first.ok).toBe(true);

		// Drizzle reaches this through the active-identity partial unique index
		// (`hr_statutory_profile_org_employee_open_uidx`); memory reaches it
		// through an explicit open-segment guard. Both must be CONFLICT.
		const backdated = await upsertStatutoryProfile(
			upsertPayload({
				organizationId,
				actorUserId,
				employeeId: employee.id,
				tag: `backdate-2-${suffix}`,
				effectiveFrom: "2026-04-01",
			}),
			ready,
		);
		expect(backdated.ok).toBe(false);
		if (!backdated.ok) {
			expect(backdated.code).toBe("CONFLICT");
		}

		const sameDate = await upsertStatutoryProfile(
			upsertPayload({
				organizationId,
				actorUserId,
				employeeId: employee.id,
				tag: `backdate-3-${suffix}`,
				effectiveFrom: "2026-05-01",
			}),
			ready,
		);
		expect(sameDate.ok).toBe(false);
		if (!sameDate.ok) {
			expect(sameDate.code).toBe("CONFLICT");
		}
	});

	it("records prior-employer year-to-date figures and replays idempotently", async () => {
		const ready = statutoryHarness(adapter);
		const employee = await seedEmployee(ready, {
			organizationId,
			actorUserId,
			suffix: `ytd-${suffix}`,
		});
		const payload = {
			organizationId,
			actorUserId,
			correlationId: `corr-ytd-${suffix}`,
			idempotencyKey: `idem-ytd-${suffix}`,
			employeeId: employee.id,
			jurisdictionCode: "MY" as const,
			taxYear: 2026,
			priorEmployerName: "Prior Employer Sdn Bhd",
			grossAmount: "48000.00",
			taxWithheldAmount: "3200.50",
			statutoryContributionAmount: "5280.00",
			currencyCode: "MYR",
			recordedOn: "2026-07-01",
		};

		const recorded = await recordPriorEmployerYtd(payload, ready);
		expect(recorded.ok).toBe(true);
		if (!recorded.ok) {
			return;
		}
		expect(recorded.data.grossAmount).toBe("48000.00");
		expect(recorded.data.currencyCode).toBe("MYR");

		const replay = await recordPriorEmployerYtd(payload, ready);
		expect(replay.ok).toBe(true);
		if (!replay.ok) {
			return;
		}
		expect(replay.data.id).toBe(recorded.data.id);

		const duplicateYear = await recordPriorEmployerYtd(
			{ ...payload, idempotencyKey: `idem-ytd-dup-${suffix}` },
			ready,
		);
		expect(duplicateYear.ok).toBe(false);
		if (!duplicateYear.ok) {
			expect(duplicateYear.code).toBe("CONFLICT");
		}

		const listed = await listPriorEmployerYtd(
			{
				organizationId,
				actorUserId,
				correlationId: `corr-ytd-list-${suffix}`,
				employeeId: employee.id,
			},
			ready,
		);
		expect(listed.ok).toBe(true);
		if (!listed.ok) {
			return;
		}
		expect(listed.data).toHaveLength(1);
		expect(listed.data[0]?.taxYear).toBe(2026);
	});

	it("excludes a restriction-active subject from statutory reads", async () => {
		const ready = statutoryHarness(adapter);
		const employee = await seedEmployee(ready, {
			organizationId,
			actorUserId,
			suffix: `restrict-${suffix}`,
		});
		const created = await upsertStatutoryProfile(
			upsertPayload({
				organizationId,
				actorUserId,
				employeeId: employee.id,
				tag: `restrict-1-${suffix}`,
				effectiveFrom: "2026-01-01",
			}),
			ready,
		);
		expect(created.ok).toBe(true);

		const placed = await restrictEmployeeData(
			{
				organizationId,
				actorUserId,
				correlationId: `corr-restrict-${suffix}`,
				subjectEmployeeId: employee.id,
				legalBasis: "data_subject_request",
				requestedAt: "2026-07-25T00:00:00.000Z",
				classifications: ["pay_and_benefits"],
				restrictionReference: `dsar-${suffix}`,
			},
			ready,
		);
		expect(placed.ok).toBe(true);

		const blocked = await getStatutoryProfile(
			{
				organizationId,
				actorUserId,
				correlationId: `corr-restrict-read-${suffix}`,
				employeeId: employee.id,
			},
			ready,
		);
		expect(blocked.ok).toBe(false);
		if (!blocked.ok) {
			expect(blocked.code).toBe("CONFLICT");
		}

		const listed = await listStatutoryProfiles(
			{
				organizationId,
				actorUserId,
				correlationId: `corr-restrict-list-${suffix}`,
				employeeId: employee.id,
			},
			ready,
		);
		expect(listed.ok).toBe(true);
		if (!listed.ok) {
			return;
		}
		expect(listed.data.profiles).toHaveLength(0);
		expect(listed.data.restrictedExcluded).toBe(1);
		expect(listed.data.total).toBe(1);
	});
}

describe("human-resources statutory profile parity (memory)", () => {
	defineStatutoryProfileParitySuite("memory");
});

describe.skipIf(!runDrizzleParity)(
	"human-resources statutory profile parity (drizzle/neon)",
	() => {
		defineStatutoryProfileParitySuite("drizzle");
	},
);
