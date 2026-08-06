/**
 * D0 statutory-fact capture invariants (`docs/erp/hr-payroll-bridging.md` §D0).
 */

import { describe, expect, it } from "vitest";
import {
	liftEmployeeDataRestriction,
	restrictEmployeeData,
} from "../src/features/privacy/operations";
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
import {
	HUMAN_RESOURCES_PERMISSION_CODES,
	HUMAN_RESOURCES_PERMISSION_SENSITIVE_IDENTIFIERS_READ,
} from "../src/kernel/authorization/permissions";
import type { HumanResourcesCommandOptions } from "../src/kernel/execution/command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE,
} from "../src/kernel/execution/error-codes";
import { mapPersistenceFailure } from "../src/kernel/execution/persistence-errors";
import type { HumanResourcesEmployeeId } from "../src/kernel/identity/brands";
import { createMemoryHumanResourcesStore } from "../src/testing/index";
import { createTestHumanResourcesCommandOptions } from "./helpers/command-options";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";
import { createHumanResourcesTestPrivacyPort } from "./helpers/privacy-options";
import { humanResourcesCodeFromResult } from "./helpers/result-details";

const ORG = "org-statutory-a";
const ORG_B = "org-statutory-b";
const ACTOR = "user-statutory-1";

function harness(
	permissions: readonly string[] = HUMAN_RESOURCES_PERMISSION_CODES,
): HumanResourcesCommandOptions {
	return createTestHumanResourcesCommandOptions({
		store: createMemoryHumanResourcesStore(),
		ports: createMemoryMutationPorts(),
		authorization: createGrantingHumanResourcesAuthorization(
			permissions as never,
		),
		privacy: createHumanResourcesTestPrivacyPort(),
	});
}

async function seedEmployee(
	options: HumanResourcesCommandOptions,
	input: { organizationId: string; tag: string },
): Promise<HumanResourcesEmployeeId> {
	const created = await createEmployee(
		{
			organizationId: input.organizationId,
			actorUserId: ACTOR,
			correlationId: `corr-seed-${input.tag}`,
			idempotencyKey: `idem-seed-${input.tag}`,
			employeeNumber: `EMP-${input.tag}`,
			legalName: `Statutory Subject ${input.tag}`,
		},
		options,
	);
	if (!created.ok) {
		throw new Error(created.message);
	}
	return created.data.id;
}

function upsertInput(input: {
	employeeId: HumanResourcesEmployeeId;
	organizationId?: string;
	tag: string;
	effectiveFrom: string;
	taxResidencyStatus?: "resident" | "non_resident";
	jurisdictionCode?: "MY" | "VN";
	minimumWageZone?: "I" | "II" | "III" | "IV" | null;
	dependantCount?: number;
}) {
	return {
		organizationId: input.organizationId ?? ORG,
		actorUserId: ACTOR,
		correlationId: `corr-${input.tag}`,
		idempotencyKey: `idem-${input.tag}`,
		employeeId: input.employeeId,
		jurisdictionCode: input.jurisdictionCode ?? "MY",
		taxResidencyStatus: input.taxResidencyStatus ?? "resident",
		nationalityCountryCode: "MY",
		expatriate: false,
		minimumWageZone: input.minimumWageZone ?? null,
		taxFileNumber: "SG-12345678",
		employeeProvidentFundNumber: "EPF-99887766",
		socialSecurityNumber: "SOCSO-556677",
		socialInsuranceBookNumber: null,
		dependantCount: input.dependantCount ?? 2,
		reliefDeclarations: [
			{ reliefCode: "self" as const },
			{ reliefCode: "child" as const, dependantReference: "child-1" },
		],
		effectiveFrom: input.effectiveFrom,
	};
}

describe("HR statutory profile capture (D0)", () => {
	it("captures an effective-dated profile and resolves it as of a date", async () => {
		const options = harness();
		const employeeId = await seedEmployee(options, {
			organizationId: ORG,
			tag: "asof",
		});

		const created = await upsertStatutoryProfile(
			upsertInput({ employeeId, tag: "asof-1", effectiveFrom: "2026-01-01" }),
			options,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			throw created.error;
		}
		expect(created.data.status).toBe("active");
		expect(created.data.effectiveTo).toBeNull();
		expect(created.data.reliefDeclarationVersion).toBe(
			"hr.statutory-relief.v1",
		);
		expect(created.data.reliefDeclarations).toHaveLength(2);

		const resolved = await getStatutoryProfile(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-asof-read",
				employeeId,
				asOf: "2026-06-30",
			},
			options,
		);
		expect(resolved.ok).toBe(true);
		if (!resolved.ok) {
			throw resolved.error;
		}
		expect(resolved.data?.id).toBe(created.data.id);

		const beforeStart = await getStatutoryProfile(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-asof-before",
				employeeId,
				asOf: "2025-12-31",
			},
			options,
		);
		expect(beforeStart.ok).toBe(true);
		if (!beforeStart.ok) {
			throw beforeStart.error;
		}
		expect(beforeStart.data).toBeNull();
	});

	it("supersedes the open segment and keeps historical as-of resolution", async () => {
		const options = harness();
		const employeeId = await seedEmployee(options, {
			organizationId: ORG,
			tag: "supersede",
		});

		const first = await upsertStatutoryProfile(
			upsertInput({
				employeeId,
				tag: "supersede-1",
				effectiveFrom: "2026-01-01",
			}),
			options,
		);
		if (!first.ok) {
			throw first.error;
		}

		const second = await upsertStatutoryProfile(
			upsertInput({
				employeeId,
				tag: "supersede-2",
				effectiveFrom: "2026-07-01",
				taxResidencyStatus: "non_resident",
			}),
			options,
		);
		expect(second.ok).toBe(true);
		if (!second.ok) {
			throw second.error;
		}
		expect(second.data.supersedesStatutoryProfileId).toBe(first.data.id);
		expect(second.data.taxResidencyStatus).toBe("non_resident");

		const historical = await getStatutoryProfile(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-supersede-hist",
				employeeId,
				asOf: "2026-03-01",
			},
			options,
		);
		if (!historical.ok) {
			throw historical.error;
		}
		expect(historical.data?.id).toBe(first.data.id);
		expect(historical.data?.status).toBe("superseded");
		expect(historical.data?.effectiveTo).toBe("2026-06-30");

		const current = await getStatutoryProfile(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-supersede-current",
				employeeId,
				asOf: "2026-08-01",
			},
			options,
		);
		if (!current.ok) {
			throw current.error;
		}
		expect(current.data?.id).toBe(second.data.id);
	});

	it("rejects a segment that does not advance the open effective date", async () => {
		const options = harness();
		const employeeId = await seedEmployee(options, {
			organizationId: ORG,
			tag: "backdate",
		});

		const first = await upsertStatutoryProfile(
			upsertInput({
				employeeId,
				tag: "backdate-1",
				effectiveFrom: "2026-05-01",
			}),
			options,
		);
		if (!first.ok) {
			throw first.error;
		}

		const backdated = await upsertStatutoryProfile(
			upsertInput({
				employeeId,
				tag: "backdate-2",
				effectiveFrom: "2026-04-01",
			}),
			options,
		);
		expect(backdated.ok).toBe(false);
		expect(humanResourcesCodeFromResult(backdated)).toBe(
			HUMAN_RESOURCES_ERROR_CONFLICT,
		);
	});

	it("returns the same profile for a replayed idempotency key", async () => {
		const options = harness();
		const employeeId = await seedEmployee(options, {
			organizationId: ORG,
			tag: "idem",
		});

		const first = await upsertStatutoryProfile(
			upsertInput({ employeeId, tag: "idem-1", effectiveFrom: "2026-01-01" }),
			options,
		);
		if (!first.ok) {
			throw first.error;
		}
		const replay = await upsertStatutoryProfile(
			upsertInput({ employeeId, tag: "idem-1", effectiveFrom: "2026-01-01" }),
			options,
		);
		expect(replay.ok).toBe(true);
		if (!replay.ok) {
			throw replay.error;
		}
		expect(replay.data.id).toBe(first.data.id);

		const divergent = await upsertStatutoryProfile(
			{
				...upsertInput({
					employeeId,
					tag: "idem-1",
					effectiveFrom: "2026-01-01",
				}),
				dependantCount: 5,
			},
			options,
		);
		expect(divergent.ok).toBe(false);
		expect(humanResourcesCodeFromResult(divergent)).toBe(
			HUMAN_RESOURCES_ERROR_CONFLICT,
		);
	});

	it("rejects tenant-context injection through nested payload keys", async () => {
		const options = harness();
		const employeeId = await seedEmployee(options, {
			organizationId: ORG,
			tag: "inject",
		});

		const injected = await upsertStatutoryProfile(
			{
				...upsertInput({
					employeeId,
					tag: "inject-1",
					effectiveFrom: "2026-01-01",
				}),
				nested: {
					organizationId: ORG_B,
					actorUserId: "attacker",
					correlationId: "evil",
				},
			},
			options,
		);
		expect(injected.ok).toBe(false);
		expect(humanResourcesCodeFromResult(injected)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_INPUT,
		);
	});

	it("rejects an unknown employee", async () => {
		const options = harness();
		const missing = await upsertStatutoryProfile(
			upsertInput({
				employeeId:
					"550e8400-e29b-41d4-a716-4466554400ff" as HumanResourcesEmployeeId,
				tag: "missing-1",
				effectiveFrom: "2026-01-01",
			}),
			options,
		);
		expect(missing.ok).toBe(false);
		expect(humanResourcesCodeFromResult(missing)).toBe(
			HUMAN_RESOURCES_ERROR_NOT_FOUND,
		);
	});

	it("keeps another organization's profile invisible", async () => {
		const options = harness();
		const employeeId = await seedEmployee(options, {
			organizationId: ORG,
			tag: "tenant",
		});
		const created = await upsertStatutoryProfile(
			upsertInput({ employeeId, tag: "tenant-1", effectiveFrom: "2026-01-01" }),
			options,
		);
		if (!created.ok) {
			throw created.error;
		}

		const crossTenant = await getStatutoryProfile(
			{
				organizationId: ORG_B,
				actorUserId: ACTOR,
				correlationId: "corr-tenant-read",
				employeeId,
				asOf: "2026-06-01",
			},
			options,
		);
		expect(crossTenant.ok).toBe(true);
		if (!crossTenant.ok) {
			throw crossTenant.error;
		}
		expect(crossTenant.data).toBeNull();

		const crossTenantList = await listStatutoryProfiles(
			{
				organizationId: ORG_B,
				actorUserId: ACTOR,
				correlationId: "corr-tenant-list",
			},
			options,
		);
		if (!crossTenantList.ok) {
			throw crossTenantList.error;
		}
		expect(crossTenantList.data.profiles).toHaveLength(0);
		expect(crossTenantList.data.total).toBe(0);
	});

	it("captures the Vietnam regional minimum-wage zone as an HR fact", async () => {
		const options = harness();
		const employeeId = await seedEmployee(options, {
			organizationId: ORG,
			tag: "zone",
		});
		const created = await upsertStatutoryProfile(
			upsertInput({
				employeeId,
				tag: "zone-1",
				effectiveFrom: "2026-01-01",
				jurisdictionCode: "VN",
				minimumWageZone: "II",
			}),
			options,
		);
		if (!created.ok) {
			throw created.error;
		}
		expect(created.data.jurisdictionCode).toBe("VN");
		expect(created.data.minimumWageZone).toBe("II");
	});

	it("denies statutory reads without the sensitive-identifier permissions", async () => {
		const options = harness();
		const employeeId = await seedEmployee(options, {
			organizationId: ORG,
			tag: "authz",
		});
		const created = await upsertStatutoryProfile(
			upsertInput({ employeeId, tag: "authz-1", effectiveFrom: "2026-01-01" }),
			options,
		);
		if (!created.ok) {
			throw created.error;
		}

		const denied = await getStatutoryProfile(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-authz-read",
				employeeId,
			},
			{
				...options,
				authorization: createGrantingHumanResourcesAuthorization([]),
			},
		);
		expect(denied.ok).toBe(false);
	});

	it("reads succeed for an actor holding only the sensitive-identifier read code", async () => {
		const options = harness();
		const employeeId = await seedEmployee(options, {
			organizationId: ORG,
			tag: "readonly",
		});
		const created = await upsertStatutoryProfile(
			upsertInput({
				employeeId,
				tag: "readonly-1",
				effectiveFrom: "2026-01-01",
			}),
			options,
		);
		if (!created.ok) {
			throw created.error;
		}

		const read = await getStatutoryProfile(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-readonly",
				employeeId,
			},
			{
				...options,
				authorization: createGrantingHumanResourcesAuthorization([
					HUMAN_RESOURCES_PERMISSION_SENSITIVE_IDENTIFIERS_READ,
				]),
			},
		);
		expect(read.ok).toBe(true);
	});
});

describe("HR statutory profile restriction exclusion (D7)", () => {
	it("excludes a restricted subject from statutory reads until the restriction lifts", async () => {
		const privacy = createHumanResourcesTestPrivacyPort();
		const options = createTestHumanResourcesCommandOptions({
			store: createMemoryHumanResourcesStore(),
			ports: createMemoryMutationPorts(),
			authorization: createGrantingHumanResourcesAuthorization(
				HUMAN_RESOURCES_PERMISSION_CODES,
			),
			privacy,
		});
		const employeeId = await seedEmployee(options, {
			organizationId: ORG,
			tag: "restrict",
		});
		const created = await upsertStatutoryProfile(
			upsertInput({
				employeeId,
				tag: "restrict-1",
				effectiveFrom: "2026-01-01",
			}),
			options,
		);
		if (!created.ok) {
			throw created.error;
		}

		const beforeRestriction = await getStatutoryProfile(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-restrict-before",
				employeeId,
			},
			options,
		);
		expect(beforeRestriction.ok).toBe(true);

		const placed = await restrictEmployeeData(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-restrict-place",
				subjectEmployeeId: employeeId,
				legalBasis: "data_subject_request",
				requestedAt: "2026-07-25T00:00:00.000Z",
				classifications: ["pay_and_benefits"],
				restrictionReference: "dsar-hold",
			},
			options,
		);
		expect(placed.ok).toBe(true);

		const blocked = await getStatutoryProfile(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-restrict-blocked",
				employeeId,
			},
			options,
		);
		expect(blocked.ok).toBe(false);
		if (!blocked.ok) {
			expect(blocked.code).toBe("CONFLICT");
		}

		const listed = await listStatutoryProfiles(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-restrict-list",
			},
			options,
		);
		if (!listed.ok) {
			throw listed.error;
		}
		expect(listed.data.profiles).toHaveLength(0);
		expect(listed.data.restrictedExcluded).toBe(1);
		expect(listed.data.total).toBe(1);

		const priorYtdBlocked = await listPriorEmployerYtd(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-restrict-ytd",
				employeeId,
			},
			options,
		);
		expect(priorYtdBlocked.ok).toBe(false);
		if (!priorYtdBlocked.ok) {
			expect(priorYtdBlocked.code).toBe("CONFLICT");
		}

		if (!placed.ok) {
			throw placed.error;
		}
		const lifted = await liftEmployeeDataRestriction(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-restrict-lift",
				restrictionId: placed.data.restrictionId,
				reason: "dsar-resolved",
				liftedAt: "2026-07-26T00:00:00.000Z",
			},
			options,
		);
		expect(lifted.ok).toBe(true);

		const restored = await getStatutoryProfile(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-restrict-restored",
				employeeId,
			},
			options,
		);
		expect(restored.ok).toBe(true);
		if (!restored.ok) {
			throw restored.error;
		}
		expect(restored.data?.id).toBe(created.data.id);

		const relisted = await listStatutoryProfiles(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-restrict-relist",
			},
			options,
		);
		if (!relisted.ok) {
			throw relisted.error;
		}
		expect(relisted.data.profiles).toHaveLength(1);
		expect(relisted.data.restrictedExcluded).toBe(0);
	});

	it("fails closed when no privacy capability is composed", async () => {
		const options = createTestHumanResourcesCommandOptions({
			store: createMemoryHumanResourcesStore(),
			ports: createMemoryMutationPorts(),
			authorization: createGrantingHumanResourcesAuthorization(
				HUMAN_RESOURCES_PERMISSION_CODES,
			),
		});
		const employeeId = await seedEmployee(options, {
			organizationId: ORG,
			tag: "failclosed",
		});
		const created = await upsertStatutoryProfile(
			upsertInput({
				employeeId,
				tag: "failclosed-1",
				effectiveFrom: "2026-01-01",
			}),
			options,
		);
		expect(created.ok).toBe(true);

		const read = await getStatutoryProfile(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-failclosed",
				employeeId,
			},
			options,
		);
		expect(read.ok).toBe(false);
		if (!read.ok) {
			expect(read.code).toBe("CONFLICT");
		}

		const listed = await listStatutoryProfiles(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-failclosed-list",
			},
			options,
		);
		expect(listed.ok).toBe(false);
		if (!listed.ok) {
			expect(listed.code).toBe("CONFLICT");
		}

		const priorYtd = await listPriorEmployerYtd(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-failclosed-ytd",
				employeeId,
			},
			options,
		);
		expect(priorYtd.ok).toBe(false);
		if (!priorYtd.ok) {
			expect(priorYtd.code).toBe("CONFLICT");
		}
	});

	it("still accepts writes for a restriction-active subject (HR-wide posture)", async () => {
		const options = harness();
		const employeeId = await seedEmployee(options, {
			organizationId: ORG,
			tag: "write-under-restriction",
		});
		const placed = await restrictEmployeeData(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-write-restrict-place",
				subjectEmployeeId: employeeId,
				legalBasis: "data_subject_request",
				requestedAt: "2026-07-25T00:00:00.000Z",
				classifications: ["pay_and_benefits"],
				restrictionReference: "dsar-write-hold",
			},
			options,
		);
		expect(placed.ok).toBe(true);

		// Deliberate: HR restriction suppresses disclosure (reads/exports) and
		// blocks anonymization; no HR write command consults evaluateRestriction.
		// Statutory capture matches that posture rather than inventing a
		// feature-local rule. See `src/features/statutory-profile/privacy.ts`.
		const captured = await upsertStatutoryProfile(
			upsertInput({
				employeeId,
				tag: "write-under-restriction-1",
				effectiveFrom: "2026-01-01",
			}),
			options,
		);
		expect(captured.ok).toBe(true);
	});
});

describe("HR statutory profile persistence-error mapping", () => {
	function uniqueViolation(constraint: string): Error {
		return Object.assign(
			new Error(
				`duplicate key value violates unique constraint "${constraint}"`,
			),
			{ code: "23505", constraint },
		);
	}

	it("maps the active-identity open-segment violation to CONFLICT", () => {
		const mapped = mapPersistenceFailure(
			uniqueViolation("hr_statutory_profile_org_employee_open_uidx"),
			"Failed to record statutory profile",
		);
		expect(mapped.ok).toBe(false);
		if (!mapped.ok) {
			expect(mapped.code).toBe("CONFLICT");
			expect(humanResourcesCodeFromResult(mapped)).toBe(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			);
		}
	});

	it("maps the prior-employer natural-key violation to CONFLICT", () => {
		const mapped = mapPersistenceFailure(
			uniqueViolation("hr_prior_employer_ytd_org_employee_year_uidx"),
			"Failed to record prior-employer year-to-date",
		);
		expect(mapped.ok).toBe(false);
		if (!mapped.ok) {
			expect(mapped.code).toBe("CONFLICT");
		}
	});

	it("keeps infrastructure failures out of the business-conflict lane", () => {
		const mapped = mapPersistenceFailure(
			new Error("connection terminated unexpectedly"),
			"Failed to record prior-employer year-to-date",
		);
		expect(mapped.ok).toBe(false);
		if (!mapped.ok) {
			expect(mapped.code).toBe("INTERNAL_ERROR");
			expect(humanResourcesCodeFromResult(mapped)).toBe(
				HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE,
			);
		}
	});
});

describe("HR prior-employer year-to-date capture (D0)", () => {
	function ytdInput(input: {
		employeeId: HumanResourcesEmployeeId;
		tag: string;
		taxYear?: number;
		organizationId?: string;
	}) {
		return {
			organizationId: input.organizationId ?? ORG,
			actorUserId: ACTOR,
			correlationId: `corr-${input.tag}`,
			idempotencyKey: `idem-${input.tag}`,
			employeeId: input.employeeId,
			jurisdictionCode: "MY" as const,
			taxYear: input.taxYear ?? 2026,
			priorEmployerName: "Prior Employer Sdn Bhd",
			grossAmount: "48000.00",
			taxWithheldAmount: "3200.50",
			statutoryContributionAmount: "5280.00",
			currencyCode: "MYR",
			recordedOn: "2026-07-01",
		};
	}

	it("captures and retrieves prior-employer hire-year figures", async () => {
		const options = harness();
		const employeeId = await seedEmployee(options, {
			organizationId: ORG,
			tag: "ytd",
		});

		const recorded = await recordPriorEmployerYtd(
			ytdInput({ employeeId, tag: "ytd-1" }),
			options,
		);
		expect(recorded.ok).toBe(true);
		if (!recorded.ok) {
			throw recorded.error;
		}
		expect(recorded.data.grossAmount).toBe("48000.00");
		expect(recorded.data.currencyCode).toBe("MYR");

		const listed = await listPriorEmployerYtd(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-ytd-list",
				employeeId,
			},
			options,
		);
		if (!listed.ok) {
			throw listed.error;
		}
		expect(listed.data).toHaveLength(1);
		expect(listed.data[0]?.taxYear).toBe(2026);
	});

	it("replays the same record for a repeated idempotency key", async () => {
		const options = harness();
		const employeeId = await seedEmployee(options, {
			organizationId: ORG,
			tag: "ytd-idem",
		});
		const first = await recordPriorEmployerYtd(
			ytdInput({ employeeId, tag: "ytd-idem-1" }),
			options,
		);
		if (!first.ok) {
			throw first.error;
		}
		const replay = await recordPriorEmployerYtd(
			ytdInput({ employeeId, tag: "ytd-idem-1" }),
			options,
		);
		if (!replay.ok) {
			throw replay.error;
		}
		expect(replay.data.id).toBe(first.data.id);
	});

	it("refuses a second assertion for the same tax year and jurisdiction", async () => {
		const options = harness();
		const employeeId = await seedEmployee(options, {
			organizationId: ORG,
			tag: "ytd-dup",
		});
		const first = await recordPriorEmployerYtd(
			ytdInput({ employeeId, tag: "ytd-dup-1" }),
			options,
		);
		expect(first.ok).toBe(true);
		const second = await recordPriorEmployerYtd(
			ytdInput({ employeeId, tag: "ytd-dup-2" }),
			options,
		);
		expect(second.ok).toBe(false);
		expect(humanResourcesCodeFromResult(second)).toBe(
			HUMAN_RESOURCES_ERROR_CONFLICT,
		);
	});

	it("keeps another organization's prior-employer figures invisible", async () => {
		const options = harness();
		const employeeId = await seedEmployee(options, {
			organizationId: ORG,
			tag: "ytd-tenant",
		});
		const recorded = await recordPriorEmployerYtd(
			ytdInput({ employeeId, tag: "ytd-tenant-1" }),
			options,
		);
		expect(recorded.ok).toBe(true);

		const crossTenant = await listPriorEmployerYtd(
			{
				organizationId: ORG_B,
				actorUserId: ACTOR,
				correlationId: "corr-ytd-tenant",
				employeeId,
			},
			options,
		);
		if (!crossTenant.ok) {
			throw crossTenant.error;
		}
		expect(crossTenant.data).toHaveLength(0);
	});

	it("rejects a malformed money amount", async () => {
		const options = harness();
		const employeeId = await seedEmployee(options, {
			organizationId: ORG,
			tag: "ytd-money",
		});
		const invalid = await recordPriorEmployerYtd(
			{
				...ytdInput({ employeeId, tag: "ytd-money-1" }),
				grossAmount: "48,000",
			},
			options,
		);
		expect(invalid.ok).toBe(false);
		expect(humanResourcesCodeFromResult(invalid)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_INPUT,
		);
	});
});
