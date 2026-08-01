import { errorResult } from "@afenda/errors";
import type {
	HumanResourcesPrivacyCapability,
	HumanResourcesPrivacyCase,
	HumanResourcesPrivacyRequestContext,
} from "@afenda/human-resources";

import { getPlatformPrivacyService } from "@/modules/privacy/server/get-platform-privacy-service";
import type { PrivacySubjectCase } from "@/modules/privacy/types";

const HUMAN_RESOURCES_PRIVACY_MODULE_ID = "human-resources" as const;

function mapSubjectContext(input: HumanResourcesPrivacyRequestContext) {
	return {
		moduleId: HUMAN_RESOURCES_PRIVACY_MODULE_ID,
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		subjectId: input.subjectEmployeeId,
		requestedAt: input.requestedAt,
		legalBasis: input.legalBasis,
	};
}

function mapPrivacyCase(
	data: PrivacySubjectCase,
): Omit<HumanResourcesPrivacyCase, "subjectEmployeeId"> {
	return {
		organizationId: data.organizationId,
		exports: data.exports,
		activeLegalHolds: data.activeLegalHolds,
		recentOperations: data.recentOperations,
	};
}

export function createHumanResourcesPrivacyPort(): HumanResourcesPrivacyCapability {
	const service = getPlatformPrivacyService();

	return {
		exportSubject(input) {
			return service.exportSubject(mapSubjectContext(input));
		},
		async getSubjectPrivacyCase(input) {
			const result = await service.getSubjectPrivacyCase(
				mapSubjectContext(input),
			);
			if (!result.ok) {
				return result;
			}
			return errorResult.ok({
				...mapPrivacyCase(result.data),
				subjectEmployeeId: input.subjectEmployeeId,
			});
		},
		rectifySubject(input) {
			return service.rectifySubject({
				...mapSubjectContext(input),
				changes: input.changes,
			});
		},
		anonymizeSubject(input) {
			return service.anonymizeSubject({
				...mapSubjectContext(input),
				classifications: input.classifications,
			});
		},
		evaluateAnonymization(input) {
			return service.evaluateAnonymization({
				...mapSubjectContext(input),
				...(input.classifications === undefined
					? {}
					: { classifications: input.classifications }),
			});
		},
		placeLegalHold(input) {
			return service.placeLegalHold({
				...mapSubjectContext(input),
				holdReference: input.holdReference,
				classifications: input.classifications,
			});
		},
		releaseLegalHold(input) {
			return service.releaseLegalHold({
				moduleId: HUMAN_RESOURCES_PRIVACY_MODULE_ID,
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				legalHoldId: input.legalHoldId,
				reason: input.reason,
				releasedAt: input.releasedAt,
			});
		},
		redactDownstream(input) {
			return service.redactDownstream({
				moduleId: HUMAN_RESOURCES_PRIVACY_MODULE_ID,
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				subjectId: input.subjectEmployeeId,
				resourceTypes: input.resourceTypes,
				requestedAt: input.requestedAt,
			});
		},
	} satisfies HumanResourcesPrivacyCapability;
}
