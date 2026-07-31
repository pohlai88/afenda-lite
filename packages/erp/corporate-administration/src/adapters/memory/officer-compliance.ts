// biome-ignore-all lint/suspicious/useAwait: The deterministic memory adapter implements asynchronous officer-compliance ports.
import { randomUUID } from "node:crypto";
import { errorResult } from "@afenda/errors";
import {
	officerConflictDisclosureIdSchema,
	officerDeclarationIdSchema,
	officerDisqualificationIdSchema,
} from "../../kernel/brands";
import {
	conflictMatchesMatter,
	declarationExpiresWithin,
	officerDisqualificationMatchesAsOf,
} from "../../officers/compliance-rules";
import type { OfficerComplianceStore } from "../../officers/compliance-store";
import type {
	ConflictDisclosure,
	OfficerDeclaration,
	OfficerDisqualification,
} from "../../officers/compliance-types";

export function createMemoryCorporateAdministrationOfficerComplianceStore(): OfficerComplianceStore {
	const declarations = new Map<string, OfficerDeclaration>();
	const disqualifications = new Map<string, OfficerDisqualification>();
	const conflicts = new Map<string, ConflictDisclosure>();

	return {
		async getOfficerDeclaration(input) {
			return errorResult.ok(
				cloneNullable(
					declarations.get(
						key(input.organizationId, input.officerDeclarationId),
					),
				),
			);
		},
		async listOfficerDeclarations(input) {
			return errorResult.ok(
				[...declarations.values()]
					.filter(
						(row) =>
							row.organizationId === input.organizationId &&
							row.officerAppointmentId === input.officerAppointmentId,
					)
					.sort((left, right) =>
						left.effectiveFrom.localeCompare(right.effectiveFrom),
					)
					.map(clone),
			);
		},
		async listExpiringDeclarations(input) {
			return errorResult.ok(
				[...declarations.values()]
					.filter(
						(row) =>
							row.organizationId === input.organizationId &&
							row.legalCompanyId === input.legalCompanyId &&
							(input.declarationType === undefined ||
								row.declarationType === input.declarationType) &&
							declarationExpiresWithin({
								declaration: row,
								asOf: input.asOf,
								windowDays: input.windowDays,
							}),
					)
					.sort((left, right) =>
						(left.expiresOn ?? "").localeCompare(right.expiresOn ?? ""),
					)
					.map(clone),
			);
		},
		async recordOfficerDeclaration(input) {
			const id = officerDeclarationIdSchema.parse(randomUUID());
			const now = new Date(input.recordedAt);
			const row: OfficerDeclaration = {
				id,
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				officerAppointmentId: input.officerAppointmentId,
				declarationType: input.declarationType,
				status: "active",
				effectiveFrom: input.effectiveFrom,
				expiresOn: input.expiresOn,
				sensitiveDetailRef: input.sensitiveDetailRef,
				maskedSummary: input.maskedSummary,
				sourceDocumentId: input.sourceDocumentId,
				supersededAt: null,
				supersededByDeclarationId: null,
				recordedAt: now,
				recordedBy: input.recordedBy,
				version: 1,
				createdAt: now,
				updatedAt: now,
			};
			declarations.set(key(input.organizationId, id), row);
			return errorResult.ok(clone(row));
		},
		async supersedeOfficerDeclaration(input) {
			const current = declarations.get(
				key(input.organizationId, input.officerDeclarationId),
			);
			if (current === undefined) {
				return notFound();
			}
			if (current.version !== input.expectedVersion) {
				return stale(input.expectedVersion, current.version);
			}
			const now = new Date(input.recordedAt);
			const updated: OfficerDeclaration = {
				...current,
				status: "superseded",
				sourceDocumentId: input.sourceDocumentId,
				supersededAt: now,
				supersededByDeclarationId: input.supersededByDeclarationId,
				recordedAt: now,
				recordedBy: input.recordedBy,
				version: current.version + 1,
				updatedAt: now,
			};
			declarations.set(key(input.organizationId, updated.id), updated);
			return errorResult.ok(clone(updated));
		},
		async getOfficerDisqualification(input) {
			return errorResult.ok(
				cloneNullable(
					disqualifications.get(
						key(input.organizationId, input.officerDisqualificationId),
					),
				),
			);
		},
		async listOfficerDisqualifications(input) {
			return errorResult.ok(
				[...disqualifications.values()]
					.filter(
						(row) =>
							row.organizationId === input.organizationId &&
							row.officerAppointmentId === input.officerAppointmentId,
					)
					.map(clone),
			);
		},
		async listActiveDisqualifications(input) {
			return errorResult.ok(
				[...disqualifications.values()]
					.filter(
						(row) =>
							row.organizationId === input.organizationId &&
							row.legalCompanyId === input.legalCompanyId &&
							(input.officerAppointmentId === undefined ||
								row.officerAppointmentId === input.officerAppointmentId) &&
							officerDisqualificationMatchesAsOf(row, input.asOf),
					)
					.sort((left, right) =>
						left.effectiveFrom.localeCompare(right.effectiveFrom),
					)
					.map(clone),
			);
		},
		async recordOfficerDisqualification(input) {
			const id = officerDisqualificationIdSchema.parse(randomUUID());
			const now = new Date(input.recordedAt);
			const row: OfficerDisqualification = {
				id,
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				officerAppointmentId: input.officerAppointmentId,
				reasonCode: input.reasonCode,
				authorityReference: input.authorityReference,
				sourceDocumentId: input.sourceDocumentId,
				effectiveFrom: input.effectiveFrom,
				effectiveTo: input.effectiveTo,
				status: "active",
				endReason: null,
				recordedAt: now,
				recordedBy: input.recordedBy,
				version: 1,
				createdAt: now,
				updatedAt: now,
			};
			disqualifications.set(key(input.organizationId, id), row);
			return errorResult.ok(clone(row));
		},
		async endOfficerDisqualification(input) {
			const current = disqualifications.get(
				key(input.organizationId, input.officerDisqualificationId),
			);
			if (current === undefined) {
				return notFound();
			}
			if (current.version !== input.expectedVersion) {
				return stale(input.expectedVersion, current.version);
			}
			const now = new Date(input.recordedAt);
			const updated: OfficerDisqualification = {
				...current,
				effectiveTo: input.endedOn,
				status: "ended",
				endReason: input.reason,
				sourceDocumentId: input.sourceDocumentId,
				recordedAt: now,
				recordedBy: input.recordedBy,
				version: current.version + 1,
				updatedAt: now,
			};
			disqualifications.set(key(input.organizationId, updated.id), updated);
			return errorResult.ok(clone(updated));
		},
		async getConflictDisclosure(input) {
			return errorResult.ok(
				cloneNullable(
					conflicts.get(key(input.organizationId, input.conflictDisclosureId)),
				),
			);
		},
		async listConflictsForMatter(input) {
			return errorResult.ok(
				[...conflicts.values()]
					.filter(
						(row) =>
							row.organizationId === input.organizationId &&
							row.legalCompanyId === input.legalCompanyId &&
							conflictMatchesMatter(row, input),
					)
					.sort(
						(left, right) =>
							left.disclosedAt.getTime() - right.disclosedAt.getTime(),
					)
					.map(clone),
			);
		},
		async discloseConflict(input) {
			const id = officerConflictDisclosureIdSchema.parse(randomUUID());
			const now = new Date(input.recordedAt);
			const row: ConflictDisclosure = {
				id,
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				officerAppointmentId: input.officerAppointmentId,
				matterType: input.matterType,
				matterId: input.matterId,
				conflictTypeCode: input.conflictTypeCode,
				status: "disclosed",
				sensitiveDetailRef: input.sensitiveDetailRef,
				maskedSummary: input.maskedSummary,
				disclosedAt: input.disclosedAt,
				recusalRecordedAt: null,
				recusalReason: null,
				sourceDocumentId: input.sourceDocumentId,
				recordedAt: now,
				recordedBy: input.recordedBy,
				version: 1,
				createdAt: now,
				updatedAt: now,
			};
			conflicts.set(key(input.organizationId, id), row);
			return errorResult.ok(clone(row));
		},
		async recordRecusal(input) {
			const current = conflicts.get(
				key(input.organizationId, input.conflictDisclosureId),
			);
			if (current === undefined) {
				return notFound();
			}
			if (current.version !== input.expectedVersion) {
				return stale(input.expectedVersion, current.version);
			}
			const now = new Date(input.recordedAt);
			const updated: ConflictDisclosure = {
				...current,
				status: "recused",
				recusalRecordedAt: now,
				recusalReason: input.recusalReason,
				sourceDocumentId: input.sourceDocumentId,
				recordedAt: now,
				recordedBy: input.recordedBy,
				version: current.version + 1,
				updatedAt: now,
			};
			conflicts.set(key(input.organizationId, updated.id), updated);
			return errorResult.ok(clone(updated));
		},
	};
}

function key(organizationId: string, id: string) {
	return `${organizationId}:${id}`;
}

function clone<T>(value: T): T {
	return structuredClone(value);
}

function cloneNullable<T>(value: T | undefined): T | null {
	return value === undefined ? null : clone(value);
}

function notFound() {
	return errorResult.fail("NOT_FOUND", {
		publicMessage: "Corporate Administration record was not found.",
	});
}

function stale(_expectedVersion: number, _actualVersion: number) {
	return errorResult.fail("CONFLICT", {
		publicMessage: "Corporate Administration record version is stale.",
	});
}
