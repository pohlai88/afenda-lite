import { errorResult, type Result } from "@afenda/errors";
import {
	PAYROLL_RETENTION_CLASSIFICATIONS,
	type PayrollPrivacyCapability,
	type PayrollPrivacyRequestContext,
	type PayrollRetentionClassification,
	type PayrollRetentionEvidence,
} from "@afenda/payroll";

import { getPlatformPrivacyService } from "@/modules/privacy/server/get-platform-privacy-service";

const PAYROLL_PRIVACY_MODULE_ID = "payroll" as const;

function mapSubjectContext(input: PayrollPrivacyRequestContext) {
	return {
		moduleId: PAYROLL_PRIVACY_MODULE_ID,
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		subjectId: input.subjectEmployeeId,
		requestedAt: input.requestedAt,
		legalBasis: input.legalBasis,
	};
}

function parseRetentionClassifications(
	values: readonly string[],
	correlationId: string,
): Result<readonly PayrollRetentionClassification[]> {
	const classifications: PayrollRetentionClassification[] = [];
	for (const value of values) {
		const match = PAYROLL_RETENTION_CLASSIFICATIONS.find(
			(candidate) => candidate === value,
		);
		if (match === undefined) {
			// The platform privacy store persisted a classification this module
			// does not own; that is an integrity fault, never caller input.
			return errorResult.fail("INTERNAL_ERROR", { correlationId });
		}
		classifications.push(match);
	}
	return errorResult.ok(classifications);
}

function mapRetentionEvidence(input: {
	classifications: readonly string[];
	correlationId: string;
	clockStartedAt: string;
	eligibleForErasure: boolean;
	evidenceId: string;
	legalBasis: string;
	minimumRetentionMonths: number;
	organizationId: string;
	subjectId: string;
}): Result<PayrollRetentionEvidence> {
	const classifications = parseRetentionClassifications(
		input.classifications,
		input.correlationId,
	);
	if (!classifications.ok) {
		return classifications;
	}
	return errorResult.ok({
		evidenceId: input.evidenceId,
		organizationId: input.organizationId,
		subjectEmployeeId: input.subjectId,
		classifications: classifications.data,
		clockStartedAt: input.clockStartedAt,
		minimumRetentionMonths: input.minimumRetentionMonths,
		legalBasis: input.legalBasis,
		eligibleForErasure: input.eligibleForErasure,
	});
}

export function createPayrollPrivacyPort(): PayrollPrivacyCapability {
	const service = getPlatformPrivacyService();

	return {
		evaluateRestriction(input) {
			return service.evaluateRestriction(mapSubjectContext(input));
		},
		restrictSubject(input) {
			return service.restrictSubject({
				...mapSubjectContext(input),
				classifications: input.classifications,
				restrictionReference: input.restrictionReference,
			});
		},
		liftRestriction(input) {
			return service.liftRestriction({
				moduleId: PAYROLL_PRIVACY_MODULE_ID,
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				restrictionId: input.restrictionId,
				reason: input.reason,
				liftedAt: input.liftedAt,
			});
		},
		async recordRetentionEvidence(input) {
			const recorded = await service.recordRetentionEvidence({
				...mapSubjectContext(input),
				classifications: input.classifications,
				clockStartedAt: input.clockStartedAt,
				minimumRetentionMonths: input.minimumRetentionMonths,
			});
			if (!recorded.ok) {
				return recorded;
			}
			return mapRetentionEvidence({
				...recorded.data,
				correlationId: input.correlationId,
			});
		},
		async expireRetention(input) {
			const expired = await service.expireRetention({
				moduleId: PAYROLL_PRIVACY_MODULE_ID,
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				evidenceId: input.evidenceId,
				expiredAt: input.expiredAt,
			});
			if (!expired.ok) {
				return expired;
			}
			return mapRetentionEvidence({
				...expired.data,
				correlationId: input.correlationId,
			});
		},
		async exportSubjectAccess(input) {
			const exported = await service.recordSubjectAccessExport({
				...mapSubjectContext(input),
				projectionScope: input.projectionScope,
				records: input.records.map((record) => ({
					entity: record.entity,
					organizationId: input.organizationId,
					recordId: record.recordId,
				})),
			});
			if (!exported.ok) {
				return exported;
			}
			return errorResult.ok({
				exportReference: exported.data.exportReference,
				recordCount: input.records.length,
				projectionScope: input.projectionScope,
				records: input.records,
			});
		},
	} satisfies PayrollPrivacyCapability;
}
