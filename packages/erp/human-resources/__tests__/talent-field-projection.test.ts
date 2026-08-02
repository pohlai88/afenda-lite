import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
	projectCompetencyAssessmentFromDecision,
	projectCriticalRoleReadinessFromDecision,
	projectSuccessionCandidateFromDecision,
	projectTalentProfileAssessmentFromDecision,
	projectTalentProfileAssessmentListFromDecision,
	projectTalentProfileFromDecision,
	projectTalentProfileMobilityFromDecision,
} from "../src/features/talent/talent-field-projection";
import type {
	CompetencyAssessment,
	SuccessionCandidate,
	TalentCriticalRoleReadiness,
	TalentProfile,
	TalentProfileAssessment,
	TalentProfileMobility,
} from "../src/kernel/contracts";
import {
	humanResourcesCompetencyAssessmentIdSchema,
	humanResourcesCompetencyIdSchema,
	humanResourcesEmployeeIdSchema,
	humanResourcesPositionIdSchema,
	humanResourcesSuccessionCandidateIdSchema,
	humanResourcesSuccessionPlanIdSchema,
	humanResourcesTalentCriticalRoleReadinessIdSchema,
	humanResourcesTalentProfileAssessmentIdSchema,
	humanResourcesTalentProfileIdSchema,
	humanResourcesTalentProfileMobilityIdSchema,
} from "../src/kernel/identity/brands";

const NOW = new Date("2026-07-27T00:00:00.000Z");
const ORGANIZATION_ID = "org-1";
const EMPLOYEE_ID = humanResourcesEmployeeIdSchema.parse(randomUUID());
const TALENT_PROFILE_ID = humanResourcesTalentProfileIdSchema.parse(
	randomUUID(),
);

const deny = (...deniedFields: string[]) => ({
	allowedFields: [] as const,
	deniedFields,
});

function talentProfile(): TalentProfile {
	return {
		id: TALENT_PROFILE_ID,
		organizationId: ORGANIZATION_ID,
		employeeId: EMPLOYEE_ID,
		summary: "Leadership profile",
		currentClassification: "high_potential",
		status: "active",
		version: 1,
		createdBy: "actor-1",
		updatedBy: "actor-1",
		createdAt: NOW,
		updatedAt: NOW,
	};
}

function profileAssessment(): TalentProfileAssessment {
	return {
		id: humanResourcesTalentProfileAssessmentIdSchema.parse(randomUUID()),
		organizationId: ORGANIZATION_ID,
		talentProfileId: TALENT_PROFILE_ID,
		methodCode: "calibration_panel",
		classification: "high_potential",
		evidenceSummary: "Panel evidence",
		assessorUserId: "assessor-1",
		status: "confirmed",
		confirmedAt: NOW,
		version: 1,
		createdBy: "actor-1",
		updatedBy: "actor-1",
		createdAt: NOW,
		updatedAt: NOW,
	};
}

function profileMobility(): TalentProfileMobility {
	return {
		id: humanResourcesTalentProfileMobilityIdSchema.parse(randomUUID()),
		organizationId: ORGANIZATION_ID,
		talentProfileId: TALENT_PROFILE_ID,
		dimension: "geographic",
		preferenceCode: "open",
		scopeDetail: "APAC",
		evidenceSummary: "Employee confirmed",
		effectiveFrom: "2026-01-01",
		effectiveTo: null,
		status: "current",
		version: 1,
		createdBy: "actor-1",
		updatedBy: "actor-1",
		createdAt: NOW,
		updatedAt: NOW,
	};
}

function criticalRoleReadiness(): TalentCriticalRoleReadiness {
	return {
		id: humanResourcesTalentCriticalRoleReadinessIdSchema.parse(randomUUID()),
		organizationId: ORGANIZATION_ID,
		talentProfileId: TALENT_PROFILE_ID,
		positionId: humanResourcesPositionIdSchema.parse(randomUUID()),
		readiness: "ready_now",
		readinessEffectiveOn: "2026-01-01",
		evidenceSummary: "Calibration evidence",
		assessorUserId: "assessor-1",
		status: "current",
		version: 1,
		createdBy: "actor-1",
		updatedBy: "actor-1",
		createdAt: NOW,
		updatedAt: NOW,
	};
}

function competencyAssessment(): CompetencyAssessment {
	return {
		id: humanResourcesCompetencyAssessmentIdSchema.parse(randomUUID()),
		organizationId: ORGANIZATION_ID,
		employeeId: EMPLOYEE_ID,
		competencyId: humanResourcesCompetencyIdSchema.parse(randomUUID()),
		assessorUserId: "assessor-1",
		evidenceSource: "Observed delivery",
		scaleCode: "five_point",
		level: 5,
		effectiveOn: "2026-01-01",
		expiresOn: null,
		status: "current",
		supersedesAssessmentId: null,
		supersededByAssessmentId: null,
		version: 1,
		createdBy: "actor-1",
		updatedBy: "actor-1",
		createdAt: NOW,
		updatedAt: NOW,
	};
}

function successionCandidate(): SuccessionCandidate {
	return {
		id: humanResourcesSuccessionCandidateIdSchema.parse(randomUUID()),
		organizationId: ORGANIZATION_ID,
		successionPlanId: humanResourcesSuccessionPlanIdSchema.parse(randomUUID()),
		employeeId: EMPLOYEE_ID,
		externalCandidateRef: null,
		nominatorUserId: "nominator-1",
		readiness: "ready_now",
		readinessEffectiveOn: "2026-01-01",
		evidenceSummary: "Board evidence",
		status: "approved",
		version: 1,
		createdBy: "actor-1",
		updatedBy: "actor-1",
		createdAt: NOW,
		updatedAt: NOW,
	};
}

describe("talent field projection", () => {
	it("preserves complete records when no field is denied", () => {
		const source = profileAssessment();
		const projected = projectTalentProfileAssessmentFromDecision(
			source,
			undefined,
			{ includeSensitive: true },
		);

		expect(projected).toEqual(source);
		expect(projected).not.toBe(source);
	});

	it("nulls only denied fields and never mutates source records", () => {
		const assessment = profileAssessment();
		const mobility = profileMobility();
		const readiness = criticalRoleReadiness();
		const competency = competencyAssessment();
		const candidate = successionCandidate();

		expect(
			projectTalentProfileAssessmentFromDecision(
				assessment,
				deny("classification"),
				{ includeSensitive: true },
			),
		).toEqual({ ...assessment, classification: null });
		expect(
			projectTalentProfileMobilityFromDecision(
				mobility,
				deny("preferenceCode", "scopeDetail", "evidenceSummary"),
				{ includeSensitive: true },
			),
		).toEqual({
			...mobility,
			preferenceCode: null,
			scopeDetail: null,
			evidenceSummary: null,
		});
		expect(
			projectCriticalRoleReadinessFromDecision(
				readiness,
				deny("readiness", "readinessEffectiveOn", "evidenceSummary"),
				{ includeSensitive: true },
			),
		).toEqual({
			...readiness,
			readiness: null,
			readinessEffectiveOn: null,
			evidenceSummary: null,
		});
		expect(
			projectCompetencyAssessmentFromDecision(
				competency,
				deny("level", "evidenceSource"),
			),
		).toEqual({ ...competency, level: null, evidenceSource: null });
		expect(
			projectSuccessionCandidateFromDecision(
				candidate,
				deny("readiness", "readinessEffectiveOn", "evidenceSummary"),
			),
		).toEqual({
			...candidate,
			readiness: null,
			readinessEffectiveOn: null,
			evidenceSummary: null,
		});

		expect(assessment.classification).toBe("high_potential");
		expect(mobility.preferenceCode).toBe("open");
		expect(readiness.readiness).toBe("ready_now");
		expect(competency.level).toBe(5);
		expect(candidate.readiness).toBe("ready_now");
	});

	it("applies explicit sensitive suppression to records and list wrappers", () => {
		const profile = talentProfile();
		const assessment = profileAssessment();

		expect(
			projectTalentProfileFromDecision(profile, undefined, {
				includeSensitive: false,
			}),
		).toEqual({ ...profile, currentClassification: null });
		expect(
			projectTalentProfileAssessmentListFromDecision(
				{ assessments: [assessment] },
				undefined,
				{ includeSensitive: false },
			),
		).toEqual({
			assessments: [
				{ ...assessment, classification: null, evidenceSummary: null },
			],
		});
	});
});
