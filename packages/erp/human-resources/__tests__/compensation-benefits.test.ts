import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
	HUMAN_RESOURCES_BENEFIT_ENROLLMENT_CHANGED_EVENT,
	HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT,
} from "@afenda/events/schemas";
import { describe, expect, it } from "vitest";

import type { HumanResourcesPermission } from "../src/authorization";
import {
	humanResourcesCompensationReviewIdSchema,
	humanResourcesEmploymentIdSchema,
} from "../src/brands";
import {
	addBenefitEnrollmentDependent,
	endBenefitEnrollmentDependent,
} from "../src/compensation-benefits/benefit-dependent";
import {
	getBenefitPlanEligibility,
	setBenefitPlanEligibility,
} from "../src/compensation-benefits/benefit-eligibility";
import {
	enrolBenefit,
	getApprovedCompensationHandoff,
	waiveBenefit,
} from "../src/compensation-benefits/benefit-enrollment";
import { createBenefitPlan } from "../src/compensation-benefits/benefit-plan";
import {
	archiveCompensationGrade,
	createCompensationGrade,
	getCompensationGrade,
	listCompensationGrades,
	updateCompensationGrade,
} from "../src/compensation-benefits/compensation-grade";
import {
	archiveCompensationGradeProgressionRule,
	createCompensationGradeProgressionRule,
	listCompensationGradeProgressionRulesFromGrade,
	listEligibleProgressionTargets,
} from "../src/compensation-benefits/compensation-grade-progression-rule";
import {
	applyApprovedCompensationResult,
	createCompensationReviewDraft,
	finalizeCompensationReview,
	getCompensationReview,
	recordCompensationRecommendation,
} from "../src/compensation-benefits/compensation-review";
import { createMemoryCurrencyLookup } from "../src/compensation-benefits/currency-lookup";
import {
	approveEmployeeCompensation,
	createEmployeeCompensation,
} from "../src/compensation-benefits/employee-compensation";
import {
	createSalaryBand,
	findSalaryBandByGradeAndCurrencyAsOf,
	getSalaryBand,
	listSalaryBandsByGrade,
	supersedeSalaryBand,
} from "../src/compensation-benefits/salary-band";
import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
} from "../src/error-codes";
import {
	HUMAN_RESOURCES_PERMISSION_BENEFITS_MANAGE,
	HUMAN_RESOURCES_PERMISSION_CODES,
	HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE,
	HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
	HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
} from "../src/permissions";
import { assertCompensationReviewWithinBudget } from "../src/shared/compensation-review-budget";
import {
	addExactDecimals,
	compareExactDecimals,
	parseExactDecimal,
} from "../src/shared/exact-decimal";
import { createMemoryHumanResourcesStore } from "../src/testing";
import { seedOpenCompensationReviewCycle } from "./helpers/compensation-review-cycle-seed";
import { createMappingIdentityResolver } from "./helpers/identity-resolver";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";
import { humanResourcesCodeFromResult } from "./helpers/result-details";

const ORG_A = "org-cb-a";
const ACTOR = "user-cb-1";

function requireExactDecimal(value: string) {
	const parsed = parseExactDecimal(value);
	if (parsed === null) {
		throw new Error(`Expected valid exact decimal: ${value}`);
	}
	return parsed;
}

function harness(
	permissions: readonly HumanResourcesPermission[] = HUMAN_RESOURCES_PERMISSION_CODES,
) {
	const store = createMemoryHumanResourcesStore();
	const ports = createMemoryMutationPorts();
	const authorization = createGrantingHumanResourcesAuthorization(permissions);
	const currency = createMemoryCurrencyLookup();
	return { store, ports, authorization, currency };
}

async function seedEmployeeEmployment(ready: ReturnType<typeof harness>) {
	const seedReady = {
		...ready,
		authorization: createGrantingHumanResourcesAuthorization([
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
			HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
		]),
	};
	const employee = await createEmployee(
		{
			organizationId: ORG_A,
			actorUserId: ACTOR,
			correlationId: "corr-emp-cb",
			idempotencyKey: "idem-emp-cb",
			employeeNumber: "E-CB-1",
			legalName: "Comp Worker",
		},
		seedReady,
	);
	if (!employee.ok) {
		return employee;
	}

	const employment = await createEmployment(
		{
			organizationId: ORG_A,
			actorUserId: ACTOR,
			correlationId: "corr-employ-cb",
			employeeId: employee.data.id,
			startsOn: "2025-01-01",
		},
		seedReady,
	);
	if (!employment.ok) {
		return employment;
	}

	return {
		ok: true as const,
		employee: employee.data,
		employment: employment.data,
	};
}

async function seedGrade(ready: ReturnType<typeof harness>) {
	return await createCompensationGrade(
		{
			organizationId: ORG_A,
			actorUserId: ACTOR,
			correlationId: "corr-grade-cb",
			code: "G1",
			name: "Grade 1",
		},
		ready,
	);
}

describe("compensation & benefits (HR-07)", () => {
	it("rejects salary band when min > mid > max order is violated", async () => {
		const ready = harness();
		const grade = await seedGrade(ready);
		expect(grade.ok).toBe(true);
		if (!grade.ok) {
			return;
		}

		const band = await createSalaryBand(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-band-order",
				gradeId: grade.data.id,
				currencyCode: "USD",
				minAmount: "90000",
				midAmount: "80000",
				maxAmount: "100000",
				effectiveFrom: "2025-01-01",
			},
			ready,
		);

		expect(band.ok).toBe(false);
		if (band.ok) {
			return;
		}
		expect(humanResourcesCodeFromResult(band)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_INPUT,
		);
	});

	it("rejects unsafe-range salary band fractions in the wrong order", async () => {
		const ready = harness();
		const grade = await seedGrade(ready);
		expect(grade.ok).toBe(true);
		if (!grade.ok) {
			return;
		}

		const band = await createSalaryBand(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-band-exact-order",
				gradeId: grade.data.id,
				currencyCode: "USD",
				minAmount: "9007199254740992.0001",
				midAmount: "9007199254740992.0000",
				maxAmount: "9007199254740992.0002",
				effectiveFrom: "2025-01-01",
			},
			ready,
		);

		expect(band.ok).toBe(false);
		if (band.ok) {
			return;
		}
		expect(humanResourcesCodeFromResult(band)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_INPUT,
		);
	});

	it("adds and compares signed exact decimals across mixed scales", () => {
		const left = requireExactDecimal("9007199254740992.0001");
		const right = requireExactDecimal("-9007199254740992");
		const expected = requireExactDecimal("0.00010");
		const negativeA = requireExactDecimal("-1.2");
		const negativeB = requireExactDecimal("-1.20");

		expect(compareExactDecimals(addExactDecimals(left, right), expected)).toBe(
			0,
		);
		expect(compareExactDecimals(negativeA, negativeB)).toBe(0);
	});

	it("accepts an exact budget boundary and rejects one unit below it", () => {
		const reviewId = humanResourcesCompensationReviewIdSchema.parse(
			"00000000-0000-4000-8000-000000000071",
		);
		const employmentId = humanResourcesEmploymentIdSchema.parse(
			"00000000-0000-4000-8000-000000000072",
		);
		const review = {
			id: reviewId,
			employmentId,
			proposedBaseAmount: "9007199254740992.0001",
			proposedCurrencyCode: "USD",
			status: "recorded" as const,
		};
		const activeBaseByEmploymentId = new Map<string, string | null>([
			[employmentId, "9007199254740992.0000"],
		]);

		const atBoundary = assertCompensationReviewWithinBudget({
			cycle: {
				budgetTotalAmount: "0.0001",
				budgetCurrencyCode: "USD",
			},
			review,
			otherCycleReviews: [],
			activeBaseByEmploymentId,
		});
		const belowBoundary = assertCompensationReviewWithinBudget({
			cycle: {
				budgetTotalAmount: "0.0000",
				budgetCurrencyCode: "USD",
			},
			review,
			otherCycleReviews: [],
			activeBaseByEmploymentId,
		});

		expect(atBoundary.ok).toBe(true);
		expect(belowBoundary.ok).toBe(false);
		if (belowBoundary.ok) {
			return;
		}
		expect(humanResourcesCodeFromResult(belowBoundary)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_INPUT,
		);
	});

	it("rejects overlapping salary bands for the same grade", async () => {
		const ready = harness();
		const grade = await seedGrade(ready);
		expect(grade.ok).toBe(true);
		if (!grade.ok) {
			return;
		}

		const first = await createSalaryBand(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-band-1",
				gradeId: grade.data.id,
				currencyCode: "USD",
				minAmount: "50000",
				midAmount: "70000",
				maxAmount: "90000",
				effectiveFrom: "2025-01-01",
				effectiveTo: "2025-12-31",
			},
			ready,
		);
		expect(first.ok).toBe(true);
		if (!first.ok) {
			return;
		}

		const overlap = await createSalaryBand(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-band-2",
				gradeId: grade.data.id,
				currencyCode: "USD",
				minAmount: "55000",
				midAmount: "75000",
				maxAmount: "95000",
				effectiveFrom: "2025-06-01",
				effectiveTo: null,
			},
			ready,
		);

		expect(overlap.ok).toBe(false);
		if (overlap.ok) {
			return;
		}
		expect(humanResourcesCodeFromResult(overlap)).toBe(
			HUMAN_RESOURCES_ERROR_CONFLICT,
		);
	});

	it("allows active salary bands for the same grade in different currencies", async () => {
		const ready = harness();
		const grade = await seedGrade(ready);
		expect(grade.ok).toBe(true);
		if (!grade.ok) {
			return;
		}

		const usd = await createSalaryBand(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-band-usd",
				gradeId: grade.data.id,
				currencyCode: "USD",
				minAmount: "50000",
				midAmount: "70000",
				maxAmount: "90000",
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		const eur = await createSalaryBand(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-band-eur",
				gradeId: grade.data.id,
				currencyCode: "EUR",
				minAmount: "45000",
				midAmount: "65000",
				maxAmount: "85000",
				effectiveFrom: "2025-01-01",
			},
			ready,
		);

		expect(usd.ok).toBe(true);
		expect(eur.ok).toBe(true);
	});

	it("supersedes salary band, closes predecessor effectiveTo, and resolves as-of reads", async () => {
		const ready = harness();
		const grade = await seedGrade(ready);
		expect(grade.ok).toBe(true);
		if (!grade.ok) {
			return;
		}

		const first = await createSalaryBand(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-band-v1",
				gradeId: grade.data.id,
				currencyCode: "USD",
				minAmount: "50000",
				midAmount: "70000",
				maxAmount: "90000",
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(first.ok).toBe(true);
		if (!first.ok) {
			return;
		}

		const second = await supersedeSalaryBand(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-band-v2",
				gradeId: grade.data.id,
				currencyCode: "USD",
				minAmount: "55000",
				midAmount: "75000",
				maxAmount: "95000",
				effectiveFrom: "2025-07-01",
			},
			ready,
		);
		expect(second.ok).toBe(true);
		if (!second.ok) {
			return;
		}
		expect(second.data.supersedesSalaryBandId).toBe(first.data.id);

		const predecessor = await getSalaryBand(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-band-get-pre",
				salaryBandId: first.data.id,
			},
			ready,
		);
		expect(predecessor.ok).toBe(true);
		if (!predecessor.ok) {
			return;
		}
		expect(predecessor.data.status).toBe("superseded");
		expect(predecessor.data.effectiveTo).toBe("2025-06-30");

		const beforeSupersede = await findSalaryBandByGradeAndCurrencyAsOf(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-band-asof-before",
				gradeId: grade.data.id,
				currencyCode: "USD",
				asOf: "2025-03-01",
			},
			ready,
		);
		expect(beforeSupersede.ok).toBe(true);
		if (!beforeSupersede.ok) {
			return;
		}
		expect(beforeSupersede.data.id).toBe(first.data.id);

		const afterSupersede = await findSalaryBandByGradeAndCurrencyAsOf(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-band-asof-after",
				gradeId: grade.data.id,
				currencyCode: "USD",
				asOf: "2025-08-01",
			},
			ready,
		);
		expect(afterSupersede.ok).toBe(true);
		if (!afterSupersede.ok) {
			return;
		}
		expect(afterSupersede.data.id).toBe(second.data.id);
	});

	it("exposes grade and band query commands", async () => {
		const ready = harness([HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ]);
		const grade = await seedGrade({
			...ready,
			authorization: createGrantingHumanResourcesAuthorization([
				HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE,
				HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ,
			]),
		});
		expect(grade.ok).toBe(true);
		if (!grade.ok) {
			return;
		}

		const updated = await updateCompensationGrade(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-grade-update",
				gradeId: grade.data.id,
				name: "Grade 1 Updated",
				expectedVersion: grade.data.version,
			},
			{
				...ready,
				authorization: createGrantingHumanResourcesAuthorization([
					HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE,
				]),
			},
		);
		expect(updated.ok).toBe(true);
		if (!updated.ok) {
			return;
		}

		const got = await getCompensationGrade(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-grade-get",
				gradeId: grade.data.id,
			},
			ready,
		);
		expect(got.ok).toBe(true);
		if (!got.ok) {
			return;
		}
		expect(got.data.name).toBe("Grade 1 Updated");

		const listed = await listCompensationGrades(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-grade-list",
				page: 1,
				pageSize: 10,
			},
			ready,
		);
		expect(listed.ok).toBe(true);
		if (!listed.ok) {
			return;
		}
		expect(listed.data.grades.some((g) => g.id === grade.data.id)).toBe(true);

		const band = await createSalaryBand(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-band-query",
				gradeId: grade.data.id,
				currencyCode: "USD",
				minAmount: "50000",
				midAmount: "70000",
				maxAmount: "90000",
				effectiveFrom: "2025-01-01",
			},
			{
				...ready,
				authorization: createGrantingHumanResourcesAuthorization([
					HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE,
				]),
			},
		);
		expect(band.ok).toBe(true);
		if (!band.ok) {
			return;
		}

		const bands = await listSalaryBandsByGrade(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-band-list",
				gradeId: grade.data.id,
				page: 1,
				pageSize: 10,
			},
			ready,
		);
		expect(bands.ok).toBe(true);
		if (!bands.ok) {
			return;
		}
		expect(bands.data.bands.some((b) => b.id === band.data.id)).toBe(true);
	});

	it("blocks grade archive when active salary bands exist", async () => {
		const manageReady = harness([
			HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE,
		]);
		const grade = await seedGrade(manageReady);
		expect(grade.ok).toBe(true);
		if (!grade.ok) {
			return;
		}

		const band = await createSalaryBand(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-band-archive-guard",
				gradeId: grade.data.id,
				currencyCode: "USD",
				minAmount: "50000",
				midAmount: "70000",
				maxAmount: "90000",
				effectiveFrom: "2025-01-01",
			},
			manageReady,
		);
		expect(band.ok).toBe(true);
		if (!band.ok) {
			return;
		}

		const archived = await archiveCompensationGrade(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-grade-archive-blocked",
				gradeId: grade.data.id,
				expectedVersion: grade.data.version,
			},
			manageReady,
		);
		expect(archived.ok).toBe(false);
		if (archived.ok) {
			return;
		}
		expect(humanResourcesCodeFromResult(archived)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
		);
	});

	it("creates, lists, and archives compensation grade progression rules", async () => {
		const manageReady = harness([
			HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE,
		]);
		const readReady = {
			...manageReady,
			authorization: createGrantingHumanResourcesAuthorization([
				HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE,
				HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ,
			]),
		};

		const gradeA = await createCompensationGrade(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-grade-a",
				code: "GA",
				name: "Grade A",
			},
			manageReady,
		);
		const gradeB = await createCompensationGrade(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-grade-b",
				code: "GB",
				name: "Grade B",
			},
			manageReady,
		);
		expect(gradeA.ok).toBe(true);
		expect(gradeB.ok).toBe(true);
		if (!(gradeA.ok && gradeB.ok)) {
			return;
		}

		const sameGrade = await createCompensationGradeProgressionRule(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-prog-same",
				fromGradeId: gradeA.data.id,
				toGradeId: gradeA.data.id,
				effectiveFrom: "2025-01-01",
			},
			manageReady,
		);
		expect(sameGrade.ok).toBe(false);

		const rule = await createCompensationGradeProgressionRule(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-prog-create",
				fromGradeId: gradeA.data.id,
				toGradeId: gradeB.data.id,
				effectiveFrom: "2025-01-01",
				minMonthsInGrade: 12,
			},
			manageReady,
		);
		expect(rule.ok).toBe(true);
		if (!rule.ok) {
			return;
		}

		const targets = await listEligibleProgressionTargets(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-prog-targets",
				fromGradeId: gradeA.data.id,
				asOf: "2025-06-01",
			},
			readReady,
		);
		expect(targets.ok).toBe(true);
		if (!targets.ok) {
			return;
		}
		expect(targets.data).toHaveLength(1);
		expect(targets.data[0]?.toGradeId).toBe(gradeB.data.id);

		const listed = await listCompensationGradeProgressionRulesFromGrade(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-prog-list",
				fromGradeId: gradeA.data.id,
				page: 1,
				pageSize: 10,
				asOf: "2025-06-01",
			},
			readReady,
		);
		expect(listed.ok).toBe(true);
		if (!listed.ok) {
			return;
		}
		expect(listed.data.rules).toHaveLength(1);

		const archived = await archiveCompensationGradeProgressionRule(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-prog-archive",
				progressionRuleId: rule.data.id,
				expectedVersion: rule.data.version,
			},
			manageReady,
		);
		expect(archived.ok).toBe(true);
		if (!archived.ok) {
			return;
		}
		expect(archived.data.status).toBe("archived");
	});

	it("rejects unknown currency codes at the command boundary", async () => {
		const ready = harness();
		const grade = await seedGrade(ready);
		expect(grade.ok).toBe(true);
		if (!grade.ok) {
			return;
		}

		const band = await createSalaryBand(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-band-fx",
				gradeId: grade.data.id,
				currencyCode: "ZZZ",
				minAmount: "50000",
				midAmount: "70000",
				maxAmount: "90000",
				effectiveFrom: "2025-01-01",
			},
			ready,
		);

		expect(band.ok).toBe(false);
		if (band.ok) {
			return;
		}
		expect(humanResourcesCodeFromResult(band)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_INPUT,
		);
	});

	it("requires compensation.read (not employee.read) for approved handoff query", async () => {
		const baseReady = harness();
		const seeded = await seedEmployeeEmployment(baseReady);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) {
			return;
		}

		const readOnlyReady = {
			...baseReady,
			authorization: createGrantingHumanResourcesAuthorization([
				HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
			]),
		};
		const denied = await getApprovedCompensationHandoff(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-handoff-deny",
				employeeId: seeded.employee.id,
			},
			readOnlyReady,
		);
		expect(denied.ok).toBe(false);
		if (denied.ok) {
			return;
		}
		expect(humanResourcesCodeFromResult(denied)).toBe(
			HUMAN_RESOURCES_ERROR_FORBIDDEN,
		);

		const compensationReadReady = {
			...baseReady,
			authorization: createGrantingHumanResourcesAuthorization([
				HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ,
			]),
			identityResolver: createMappingIdentityResolver({
				[ACTOR]: seeded.employee.id,
			}),
		};
		const allowed = await getApprovedCompensationHandoff(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-handoff-allow",
				employeeId: seeded.employee.id,
			},
			compensationReadReady,
		);
		expect(allowed.ok).toBe(true);
		if (!allowed.ok) {
			return;
		}
		expect(allowed.data).toBeNull();
	});

	it("returns null handoff when employee has no active compensation", async () => {
		const ready = harness([HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ]);
		const seeded = await seedEmployeeEmployment(ready);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) {
			return;
		}
		const subjectReady = {
			...ready,
			identityResolver: createMappingIdentityResolver({
				[ACTOR]: seeded.employee.id,
			}),
		};

		const handoff = await getApprovedCompensationHandoff(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-handoff-null",
				employeeId: seeded.employee.id,
			},
			subjectReady,
		);

		expect(handoff.ok).toBe(true);
		if (!handoff.ok) {
			return;
		}
		expect(handoff.data).toBeNull();
	});

	it("returns active compensation and enrollments in approved handoff", async () => {
		const ready = harness([
			HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE,
			HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ,
			HUMAN_RESOURCES_PERMISSION_BENEFITS_MANAGE,
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
		]);
		const seeded = await seedEmployeeEmployment(ready);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) {
			return;
		}

		const compensation = await createEmployeeCompensation(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-comp",
				idempotencyKey: "idem-comp",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				baseAmount: "85000",
				currencyCode: "USD",
				payFrequency: "monthly",
				effectiveFrom: "2025-01-01",
				reason: "Initial hire",
			},
			ready,
		);
		expect(compensation.ok).toBe(true);
		if (!compensation.ok) {
			return;
		}

		const approved = await approveEmployeeCompensation(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-comp-approve",
				compensationId: compensation.data.id,
				expectedVersion: compensation.data.version,
			},
			ready,
		);
		expect(approved.ok).toBe(true);
		if (!approved.ok) {
			return;
		}

		const plan = await createBenefitPlan(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-plan",
				code: "MED",
				name: "Medical",
			},
			ready,
		);
		expect(plan.ok).toBe(true);
		if (!plan.ok) {
			return;
		}

		const enrollment = await enrolBenefit(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-enrol",
				idempotencyKey: "idem-enrol",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				planId: plan.data.id,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(enrollment.ok).toBe(true);
		if (!enrollment.ok) {
			return;
		}

		const handoff = await getApprovedCompensationHandoff(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-handoff-full",
				employeeId: seeded.employee.id,
			},
			ready,
		);

		expect(handoff.ok).toBe(true);
		if (!handoff.ok) {
			return;
		}
		expect(handoff.data).not.toBeNull();
		if (handoff.data === null) {
			return;
		}
		expect(handoff.data.activeCompensation?.id).toBe(approved.data.id);
		expect(handoff.data.activeBenefitEnrollments).toHaveLength(1);
		expect(handoff.data.activeBenefitEnrollments[0]?.id).toBe(
			enrollment.data.id,
		);
	});

	it("blocks recording a recommendation after review is finalized", async () => {
		const ready = harness([HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE]);
		const seeded = await seedEmployeeEmployment(ready);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) {
			return;
		}

		const cycle = await seedOpenCompensationReviewCycle({
			organizationId: ORG_A,
			actorUserId: ACTOR,
			ready,
			suffix: "blocked-rec",
		});

		const draft = await createCompensationReviewDraft(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-review-draft",
				idempotencyKey: "idem-review",
				cycleId: cycle.id,
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
			},
			ready,
		);
		expect(draft.ok).toBe(true);
		if (!draft.ok) {
			return;
		}

		const recommended = await recordCompensationRecommendation(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-review-rec",
				reviewId: draft.data.id,
				expectedVersion: draft.data.version,
				proposedBaseAmount: "90000",
				proposedCurrencyCode: "USD",
				effectiveFrom: "2025-07-01",
			},
			ready,
		);
		expect(recommended.ok).toBe(true);
		if (!recommended.ok) {
			return;
		}

		const finalized = await finalizeCompensationReview(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-review-fin",
				reviewId: recommended.data.id,
				expectedVersion: recommended.data.version,
			},
			ready,
		);
		expect(finalized.ok).toBe(true);
		if (!finalized.ok) {
			return;
		}

		const mutation = await recordCompensationRecommendation(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-review-after-fin",
				reviewId: finalized.data.id,
				expectedVersion: finalized.data.version,
				proposedBaseAmount: "95000",
				proposedCurrencyCode: "USD",
				effectiveFrom: "2025-08-01",
			},
			ready,
		);

		expect(mutation.ok).toBe(false);
	});

	it("rejects duplicate active benefit enrollment for the same plan", async () => {
		const ready = harness([HUMAN_RESOURCES_PERMISSION_BENEFITS_MANAGE]);
		const seeded = await seedEmployeeEmployment(ready);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) {
			return;
		}

		const plan = await createBenefitPlan(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-plan-dup",
				code: "DEN",
				name: "Dental",
			},
			ready,
		);
		expect(plan.ok).toBe(true);
		if (!plan.ok) {
			return;
		}

		const first = await enrolBenefit(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-enrol-1",
				idempotencyKey: "idem-enrol-1",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				planId: plan.data.id,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(first.ok).toBe(true);
		if (!first.ok) {
			return;
		}

		const duplicate = await enrolBenefit(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-enrol-2",
				idempotencyKey: "idem-enrol-2",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				planId: plan.data.id,
				effectiveFrom: "2025-02-01",
			},
			ready,
		);

		expect(duplicate.ok).toBe(false);
		if (duplicate.ok) {
			return;
		}
		expect(humanResourcesCodeFromResult(duplicate)).toBe(
			HUMAN_RESOURCES_ERROR_CONFLICT,
		);
	});

	it("emits compensation.changed.v1 and benefit-enrollment.changed.v1 on mutations", async () => {
		const ready = harness([
			HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE,
			HUMAN_RESOURCES_PERMISSION_BENEFITS_MANAGE,
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
		]);
		const seeded = await seedEmployeeEmployment(ready);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) {
			return;
		}

		const compensation = await createEmployeeCompensation(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-comp-event",
				idempotencyKey: "idem-comp-event",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				baseAmount: "80000",
				currencyCode: "USD",
				payFrequency: "monthly",
				effectiveFrom: "2025-01-01",
				reason: "Hire",
			},
			ready,
		);
		expect(compensation.ok).toBe(true);

		const plan = await createBenefitPlan(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-plan-event",
				code: "VIS",
				name: "Vision",
			},
			ready,
		);
		expect(plan.ok).toBe(true);
		if (!plan.ok) {
			return;
		}

		await enrolBenefit(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-enrol-event",
				idempotencyKey: "idem-enrol-event",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				planId: plan.data.id,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);

		const eventTypes = ready.ports.outbox.calls.map((call) => call.type);
		expect(eventTypes).toContain(HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT);
		expect(eventTypes).toContain(
			HUMAN_RESOURCES_BENEFIT_ENROLLMENT_CHANGED_EVENT,
		);
	});

	it("applies finalized review into employee compensation", async () => {
		const ready = harness([
			HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE,
			HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ,
		]);
		const seeded = await seedEmployeeEmployment(ready);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) {
			return;
		}

		const cycle = await seedOpenCompensationReviewCycle({
			organizationId: ORG_A,
			actorUserId: ACTOR,
			ready,
			suffix: "apply",
		});

		const draft = await createCompensationReviewDraft(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-apply-draft",
				idempotencyKey: "idem-apply-review",
				cycleId: cycle.id,
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
			},
			ready,
		);
		expect(draft.ok).toBe(true);
		if (!draft.ok) {
			return;
		}

		const recommended = await recordCompensationRecommendation(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-apply-rec",
				reviewId: draft.data.id,
				expectedVersion: draft.data.version,
				proposedBaseAmount: "92000",
				proposedCurrencyCode: "USD",
				effectiveFrom: "2025-07-01",
			},
			ready,
		);
		expect(recommended.ok).toBe(true);
		if (!recommended.ok) {
			return;
		}

		const finalized = await finalizeCompensationReview(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-apply-fin",
				reviewId: recommended.data.id,
				expectedVersion: recommended.data.version,
			},
			ready,
		);
		expect(finalized.ok).toBe(true);
		if (!finalized.ok) {
			return;
		}

		const applied = await applyApprovedCompensationResult(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-apply",
				reviewId: finalized.data.id,
				reason: "Annual review",
				idempotencyKey: "idem-apply-comp",
			},
			ready,
		);

		expect(applied.ok).toBe(true);
		if (!applied.ok) {
			return;
		}
		expect(applied.data.baseAmount).toBe("92000");
		expect(applied.data.currencyCode).toBe("USD");

		const review = await getCompensationReview(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-apply-get-review",
				reviewId: finalized.data.id,
			},
			ready,
		);
		expect(review.ok).toBe(true);
		if (!review.ok) {
			return;
		}
		expect(review.data?.appliedCompensationId).toBe(applied.data.id);
		expect(review.data?.status).toBe("finalized");
	});

	describe("benefits slice 8.5", () => {
		const benefitsReady = () =>
			harness([HUMAN_RESOURCES_PERMISSION_BENEFITS_MANAGE]);

		it("creates and reads benefit plan eligibility", async () => {
			const ready = benefitsReady();
			const seeded = await seedEmployeeEmployment(ready);
			expect(seeded.ok).toBe(true);
			if (!seeded.ok) {
				return;
			}

			const plan = await createBenefitPlan(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-85-plan",
					code: "HLTH-85",
					name: "Health 8.5",
				},
				ready,
			);
			expect(plan.ok).toBe(true);
			if (!plan.ok) {
				return;
			}

			const set = await setBenefitPlanEligibility(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-85-elig-set",
					planId: plan.data.id,
					minTenureDays: 90,
					allowedEmploymentStatuses: ["active"],
				},
				ready,
			);
			expect(set.ok).toBe(true);
			if (!set.ok) {
				return;
			}

			const got = await getBenefitPlanEligibility(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-85-elig-get",
					planId: plan.data.id,
				},
				ready,
			);
			expect(got.ok).toBe(true);
			if (!got.ok) {
				return;
			}
			expect(got.data?.minTenureDays).toBe(90);
		});

		it("blocks enrollment when employee fails eligibility", async () => {
			const ready = benefitsReady();
			const seeded = await seedEmployeeEmployment(ready);
			expect(seeded.ok).toBe(true);
			if (!seeded.ok) {
				return;
			}

			const plan = await createBenefitPlan(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-85-elig-block-plan",
					code: "TENURE",
					name: "Tenure gated",
				},
				ready,
			);
			expect(plan.ok).toBe(true);
			if (!plan.ok) {
				return;
			}

			await setBenefitPlanEligibility(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-85-elig-block-set",
					planId: plan.data.id,
					minTenureDays: 365,
					allowedEmploymentStatuses: ["active"],
				},
				ready,
			);

			const blocked = await enrolBenefit(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-85-elig-block-enrol",
					idempotencyKey: "idem-85-elig-block",
					employeeId: seeded.employee.id,
					employmentId: seeded.employment.id,
					planId: plan.data.id,
					effectiveFrom: "2025-01-01",
				},
				ready,
			);
			expect(blocked.ok).toBe(false);
			if (blocked.ok) {
				return;
			}
			expect(humanResourcesCodeFromResult(blocked)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			);
		});

		it("enrols benefit with employee and employer contributions", async () => {
			const ready = benefitsReady();
			const seeded = await seedEmployeeEmployment(ready);
			expect(seeded.ok).toBe(true);
			if (!seeded.ok) {
				return;
			}

			const plan = await createBenefitPlan(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-85-enrol-plan",
					code: "CONT",
					name: "Contributions",
				},
				ready,
			);
			expect(plan.ok).toBe(true);
			if (!plan.ok) {
				return;
			}

			const enrollment = await enrolBenefit(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-85-enrol",
					idempotencyKey: "idem-85-enrol",
					employeeId: seeded.employee.id,
					employmentId: seeded.employment.id,
					planId: plan.data.id,
					effectiveFrom: "2025-01-01",
					effectiveTo: "2025-12-31",
					employeeContributionAmount: "100.00",
					employerContributionAmount: "300.00",
					contributionCurrencyCode: "USD",
					contributionFrequency: "monthly",
				},
				ready,
			);
			expect(enrollment.ok).toBe(true);
			if (!enrollment.ok) {
				return;
			}
			expect(enrollment.data.employeeContributionAmount).toBe("100.00");
			expect(enrollment.data.employerContributionAmount).toBe("300.00");
			expect(enrollment.data.effectiveTo).toBe("2025-12-31");
		});

		it("waives an active benefit enrollment", async () => {
			const ready = benefitsReady();
			const seeded = await seedEmployeeEmployment(ready);
			expect(seeded.ok).toBe(true);
			if (!seeded.ok) {
				return;
			}

			const plan = await createBenefitPlan(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-85-waive-plan",
					code: "WAIVE",
					name: "Waivable",
				},
				ready,
			);
			expect(plan.ok).toBe(true);
			if (!plan.ok) {
				return;
			}

			const enrollment = await enrolBenefit(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-85-waive-enrol",
					idempotencyKey: "idem-85-waive-enrol",
					employeeId: seeded.employee.id,
					employmentId: seeded.employment.id,
					planId: plan.data.id,
					effectiveFrom: "2025-01-01",
				},
				ready,
			);
			expect(enrollment.ok).toBe(true);
			if (!enrollment.ok) {
				return;
			}

			const waived = await waiveBenefit(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-85-waive",
					enrollmentId: enrollment.data.id,
					expectedVersion: enrollment.data.version,
					waiverReason: "Employee opted out",
					effectiveTo: "2025-06-30",
				},
				ready,
			);
			expect(waived.ok).toBe(true);
			if (!waived.ok) {
				return;
			}
			expect(waived.data.status).toBe("waived");
			expect(waived.data.waiverReason).toBe("Employee opted out");
		});

		it("adds and ends dependent coverage on enrollment", async () => {
			const ready = benefitsReady();
			const seeded = await seedEmployeeEmployment(ready);
			expect(seeded.ok).toBe(true);
			if (!seeded.ok) {
				return;
			}

			const plan = await createBenefitPlan(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-85-dep-plan",
					code: "FAM",
					name: "Family",
				},
				ready,
			);
			expect(plan.ok).toBe(true);
			if (!plan.ok) {
				return;
			}

			const enrollment = await enrolBenefit(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-85-dep-enrol",
					idempotencyKey: "idem-85-dep-enrol",
					employeeId: seeded.employee.id,
					employmentId: seeded.employment.id,
					planId: plan.data.id,
					effectiveFrom: "2025-01-01",
				},
				ready,
			);
			expect(enrollment.ok).toBe(true);
			if (!enrollment.ok) {
				return;
			}

			const dependent = await addBenefitEnrollmentDependent(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-85-dep-add",
					enrollmentId: enrollment.data.id,
					dependentName: "Alex Dependent",
					relationship: "child",
					effectiveFrom: "2025-02-01",
				},
				ready,
			);
			expect(dependent.ok).toBe(true);
			if (!dependent.ok) {
				return;
			}

			const ended = await endBenefitEnrollmentDependent(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-85-dep-end",
					dependentId: dependent.data.id,
					expectedVersion: dependent.data.version,
					endsOn: "2025-12-31",
				},
				ready,
			);
			expect(ended.ok).toBe(true);
			if (!ended.ok) {
				return;
			}
			expect(ended.data.effectiveTo).toBe("2025-12-31");
		});

		it("rejects invalid benefit enrollment effective range", async () => {
			const ready = benefitsReady();
			const seeded = await seedEmployeeEmployment(ready);
			expect(seeded.ok).toBe(true);
			if (!seeded.ok) {
				return;
			}

			const plan = await createBenefitPlan(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-85-range-plan",
					code: "RANGE",
					name: "Range",
				},
				ready,
			);
			expect(plan.ok).toBe(true);
			if (!plan.ok) {
				return;
			}

			const invalid = await enrolBenefit(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-85-range",
					idempotencyKey: "idem-85-range",
					employeeId: seeded.employee.id,
					employmentId: seeded.employment.id,
					planId: plan.data.id,
					effectiveFrom: "2025-12-31",
					effectiveTo: "2025-01-01",
				},
				ready,
			);
			expect(invalid.ok).toBe(false);
			if (invalid.ok) {
				return;
			}
			expect(humanResourcesCodeFromResult(invalid)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			);
		});

		it("rejects mismatched contribution currency without amounts", async () => {
			const ready = benefitsReady();
			const seeded = await seedEmployeeEmployment(ready);
			expect(seeded.ok).toBe(true);
			if (!seeded.ok) {
				return;
			}

			const plan = await createBenefitPlan(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-85-contrib-plan",
					code: "CUR",
					name: "Currency",
				},
				ready,
			);
			expect(plan.ok).toBe(true);
			if (!plan.ok) {
				return;
			}

			const invalid = await enrolBenefit(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-85-contrib",
					idempotencyKey: "idem-85-contrib",
					employeeId: seeded.employee.id,
					employmentId: seeded.employment.id,
					planId: plan.data.id,
					effectiveFrom: "2025-01-01",
					contributionCurrencyCode: "USD",
				},
				ready,
			);
			expect(invalid.ok).toBe(false);
			if (invalid.ok) {
				return;
			}
			expect(humanResourcesCodeFromResult(invalid)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			);
		});
	});

	it("does not import @afenda/payroll from compensation-benefits modules", () => {
		const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
		const modules = [
			"src/compensation-benefits/compensation-grade.ts",
			"src/compensation-benefits/compensation-grade-progression-rule.ts",
			"src/compensation-benefits/salary-band.ts",
			"src/compensation-benefits/employee-compensation.ts",
			"src/compensation-benefits/compensation-review.ts",
			"src/compensation-benefits/benefit-plan.ts",
			"src/compensation-benefits/benefit-enrollment.ts",
			"src/compensation-benefits/run-operation.ts",
			"src/adapters/drizzle/compensation-benefits.ts",
		];

		for (const relativePath of modules) {
			const body = readFileSync(join(root, relativePath), "utf8");
			expect(body).not.toMatch(/@afenda\/payroll/);
			expect(body).not.toMatch(/payroll_/i);
		}
	});
});
