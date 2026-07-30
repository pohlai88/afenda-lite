// biome-ignore-all lint/suspicious/useAwait: The deterministic memory adapter implements asynchronous officer ports.
// biome-ignore-all lint/suspicious/noShadow: Domain-local callbacks intentionally mirror officer records.
import { randomUUID } from "node:crypto";
import { fail, ok } from "@afenda/errors/result";

import { corporateAdministrationErrorDetails } from "../../error-codes";
import {
	officerAppointmentIdSchema,
	officerQualificationIdSchema,
	statutoryOfficeIdSchema,
} from "../../kernel/brands";
import {
	officerAppointmentMatchesAsOf,
	statutoryOfficeMatchesAsOf,
} from "../../officers/rules";
import type { OfficerStore } from "../../officers/store";
import type {
	OfficerAppointment,
	OfficerQualification,
	StatutoryOffice,
} from "../../officers/types";

export function createMemoryCorporateAdministrationOfficerStore(): OfficerStore {
	const offices = new Map<string, StatutoryOffice>();
	const appointments = new Map<string, OfficerAppointment>();
	const qualifications = new Map<string, OfficerQualification>();

	return {
		async getStatutoryOffice(input) {
			return ok(
				cloneNullable(
					offices.get(key(input.organizationId, input.statutoryOfficeId)),
				),
			);
		},
		async listStatutoryOffices(input) {
			return ok(
				[...offices.values()]
					.filter(
						(row) =>
							row.organizationId === input.organizationId &&
							row.legalCompanyId === input.legalCompanyId,
					)
					.sort((left, right) =>
						left.officeTypeCode.localeCompare(right.officeTypeCode),
					)
					.map(clone),
			);
		},
		async listRequiredStatutoryOffices(input) {
			return ok(
				[...offices.values()]
					.filter(
						(row) =>
							row.organizationId === input.organizationId &&
							row.legalCompanyId === input.legalCompanyId &&
							(input.jurisdictionCode === undefined ||
								row.jurisdictionCode === input.jurisdictionCode) &&
							(input.includeOptional === true || row.required) &&
							statutoryOfficeMatchesAsOf(row, input.asOf),
					)
					.sort(
						(left, right) =>
							left.jurisdictionCode.localeCompare(right.jurisdictionCode) ||
							left.officeTypeCode.localeCompare(right.officeTypeCode) ||
							left.id.localeCompare(right.id),
					)
					.map(clone),
			);
		},
		async defineStatutoryOffice(input) {
			const duplicate = [...offices.values()].some(
				(row) =>
					row.organizationId === input.organizationId &&
					row.legalCompanyId === input.legalCompanyId &&
					row.jurisdictionCode === input.jurisdictionCode &&
					row.officeTypeCode === input.officeTypeCode &&
					row.status === "active",
			);
			if (duplicate) {
				return conflict("officeTypeCode");
			}
			const id = statutoryOfficeIdSchema.parse(randomUUID());
			const now = new Date(input.recordedAt);
			const row: StatutoryOffice = {
				id,
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				officeTypeCode: input.officeTypeCode,
				jurisdictionCode: input.jurisdictionCode,
				displayName: input.displayName,
				description: input.description,
				required: input.required,
				minimumHolders: input.minimumHolders,
				maximumHolders: input.maximumHolders,
				vacancyGraceDays: input.vacancyGraceDays,
				protectedRole: input.protectedRole,
				effectiveFrom: input.effectiveFrom,
				effectiveTo: null,
				status: "active",
				retirementReason: null,
				recordedAt: now,
				recordedBy: input.recordedBy,
				sourceDocumentId: input.sourceDocumentId,
				version: 1,
				createdAt: now,
				updatedAt: now,
			};
			offices.set(key(input.organizationId, id), row);
			return ok(clone(row));
		},
		async getOfficerAppointment(input) {
			return ok(
				cloneNullable(
					appointments.get(
						key(input.organizationId, input.officerAppointmentId),
					),
				),
			);
		},
		async listOfficerAppointments(input) {
			return ok(
				[...appointments.values()]
					.filter(
						(row) =>
							row.organizationId === input.organizationId &&
							row.statutoryOfficeId === input.statutoryOfficeId,
					)
					.map(clone),
			);
		},
		async listOfficersAsOf(input) {
			return ok(
				[...appointments.values()]
					.filter(
						(row) =>
							row.organizationId === input.organizationId &&
							row.legalCompanyId === input.legalCompanyId &&
							(input.statutoryOfficeId === undefined ||
								row.statutoryOfficeId === input.statutoryOfficeId) &&
							(input.officerPartyId === undefined ||
								row.officerPartyId === input.officerPartyId) &&
							officerAppointmentMatchesAsOf(row, input.asOf),
					)
					.sort(
						(left, right) =>
							left.statutoryOfficeId.localeCompare(right.statutoryOfficeId) ||
							left.effectiveFrom.localeCompare(right.effectiveFrom) ||
							left.id.localeCompare(right.id),
					)
					.map(clone),
			);
		},
		async appointOfficer(input) {
			const id = officerAppointmentIdSchema.parse(randomUUID());
			const now = new Date(input.recordedAt);
			const row: OfficerAppointment = {
				id,
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				statutoryOfficeId: input.statutoryOfficeId,
				officerPartyId: input.officerPartyId,
				appointmentMethod: input.appointmentMethod,
				appointingAuthorityType: input.appointingAuthorityType,
				appointingAuthorityId: input.appointingAuthorityId,
				consentDocumentId: input.consentDocumentId,
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
			appointments.set(key(input.organizationId, id), row);
			return ok(clone(row));
		},
		async amendOfficerAppointment(input) {
			const current = appointments.get(
				key(input.organizationId, input.officerAppointmentId),
			);
			if (current === undefined) {
				return notFound();
			}
			if (current.version !== input.expectedVersion) {
				return stale(input.expectedVersion, current.version);
			}
			const now = new Date(input.recordedAt);
			const updated: OfficerAppointment = {
				...current,
				appointmentMethod: input.appointmentMethod,
				appointingAuthorityType: input.appointingAuthorityType,
				appointingAuthorityId: input.appointingAuthorityId,
				consentDocumentId: input.consentDocumentId,
				sourceDocumentId: input.sourceDocumentId,
				effectiveFrom: input.effectiveFrom,
				effectiveTo: input.effectiveTo,
				recordedAt: now,
				recordedBy: input.recordedBy,
				version: current.version + 1,
				updatedAt: now,
			};
			appointments.set(key(input.organizationId, updated.id), updated);
			return ok(clone(updated));
		},
		async endOfficerAppointment(input) {
			const current = appointments.get(
				key(input.organizationId, input.officerAppointmentId),
			);
			if (current === undefined) {
				return notFound();
			}
			if (current.version !== input.expectedVersion) {
				return stale(input.expectedVersion, current.version);
			}
			const now = new Date(input.recordedAt);
			const updated: OfficerAppointment = {
				...current,
				effectiveTo: input.endedOn,
				status: input.status,
				endReason: input.reason,
				sourceDocumentId: input.sourceDocumentId,
				recordedAt: now,
				recordedBy: input.recordedBy,
				version: current.version + 1,
				updatedAt: now,
			};
			appointments.set(key(input.organizationId, updated.id), updated);
			return ok(clone(updated));
		},
		async recordOfficerQualification(input) {
			const id = officerQualificationIdSchema.parse(randomUUID());
			const now = new Date(input.recordedAt);
			const row: OfficerQualification = {
				id,
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				officerAppointmentId: input.officerAppointmentId,
				qualificationTypeCode: input.qualificationTypeCode,
				issuer: input.issuer,
				referenceNumber: input.referenceNumber,
				validFrom: input.validFrom,
				validTo: input.validTo,
				verificationStatus: input.verificationStatus,
				verifiedAt: input.verifiedAt,
				recordedAt: now,
				recordedBy: input.recordedBy,
				sourceDocumentId: input.sourceDocumentId,
				version: 1,
				createdAt: now,
				updatedAt: now,
			};
			qualifications.set(key(input.organizationId, id), row);
			return ok(clone(row));
		},
		async listOfficerQualifications(input) {
			return ok(
				[...qualifications.values()]
					.filter(
						(row) =>
							row.organizationId === input.organizationId &&
							row.officerAppointmentId === input.officerAppointmentId,
					)
					.sort((left, right) => left.validFrom.localeCompare(right.validFrom))
					.map(clone),
			);
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

function conflict(field: string) {
	return fail(
		"CONFLICT",
		"Corporate Administration officer record conflicts with existing history.",
		corporateAdministrationErrorDetails("CORPORATE_ADMINISTRATION_CONFLICT", {
			field,
		}),
	);
}

function notFound() {
	return fail(
		"NOT_FOUND",
		"Corporate Administration record was not found.",
		corporateAdministrationErrorDetails("CORPORATE_ADMINISTRATION_NOT_FOUND"),
	);
}

function stale(expectedVersion: number, actualVersion: number) {
	return fail(
		"CONFLICT",
		"Corporate Administration record version is stale.",
		corporateAdministrationErrorDetails(
			"CORPORATE_ADMINISTRATION_STALE_VERSION",
			{ expectedVersion, actualVersion },
		),
	);
}
