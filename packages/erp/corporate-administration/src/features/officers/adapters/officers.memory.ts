// biome-ignore-all lint/suspicious/useAwait: The deterministic memory adapter implements asynchronous officer ports.
// biome-ignore-all lint/suspicious/noShadow: Domain-local callbacks intentionally mirror officer records.
import { randomUUID } from "node:crypto";
import { errorResult } from "@afenda/errors";
import {
	officerAppointmentIdSchema,
	officerQualificationIdSchema,
	statutoryOfficeIdSchema,
} from "../../../kernel/brands";
import {
	decodeOfficerAppointmentCursor,
	decodeStatutoryOfficeCursor,
	encodeOfficerAppointmentCursor,
	encodeStatutoryOfficeCursor,
	type OfficerAppointmentCursorKey,
	officerAppointmentCursorScope,
	type StatutoryOfficeCursorKey,
	statutoryOfficeCursorScope,
} from "../pagination";
import {
	officerAppointmentMatchesAsOf,
	statutoryOfficeMatchesAsOf,
} from "../rules";
import type { OfficerStore } from "../store";
import type {
	OfficerAppointment,
	OfficerAppointmentListPage,
	OfficerQualification,
	StatutoryOffice,
	StatutoryOfficeListPage,
} from "../types";

export function createMemoryCorporateAdministrationOfficerStore(): OfficerStore {
	const offices = new Map<string, StatutoryOffice>();
	const appointments = new Map<string, OfficerAppointment>();
	const qualifications = new Map<string, OfficerQualification>();

	return {
		async getStatutoryOffice(input) {
			return errorResult.ok(
				cloneNullable(
					offices.get(key(input.organizationId, input.statutoryOfficeId)),
				),
			);
		},
		async listStatutoryOffices(input) {
			return errorResult.ok(
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
			const cursorScope = statutoryOfficeCursorScope(input);
			const cursor = decodeStatutoryOfficeCursor(input.cursor, cursorScope);
			if (!cursor.ok) {
				return cursor;
			}
			const pageSize = input.pageSize ?? 50;
			const ordered = [...offices.values()]
				.filter(
					(row) =>
						row.organizationId === input.organizationId &&
						row.legalCompanyId === input.legalCompanyId &&
						(input.jurisdictionCode === undefined ||
							row.jurisdictionCode === input.jurisdictionCode) &&
						(input.includeOptional === true || row.required) &&
						statutoryOfficeMatchesAsOf(row, input.asOf),
				)
				.sort(compareStatutoryOffices)
				.filter(
					(office) =>
						cursor.data === null ||
						compareStatutoryOfficeCursor(office, cursor.data) > 0,
				)
				.slice(0, pageSize + 1);
			const pageRows = ordered.slice(0, pageSize);
			const last = pageRows.at(-1);
			return errorResult.ok({
				items: pageRows.map(clone),
				nextCursor:
					ordered.length > pageSize && last !== undefined
						? encodeStatutoryOfficeCursor(
								cursorScope,
								statutoryOfficeCursorKey(last),
							)
						: null,
			} satisfies StatutoryOfficeListPage);
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
			return errorResult.ok(clone(row));
		},
		async getOfficerAppointment(input) {
			return errorResult.ok(
				cloneNullable(
					appointments.get(
						key(input.organizationId, input.officerAppointmentId),
					),
				),
			);
		},
		async listOfficerAppointments(input) {
			return errorResult.ok(
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
			const cursorScope = officerAppointmentCursorScope(input);
			const cursor = decodeOfficerAppointmentCursor(input.cursor, cursorScope);
			if (!cursor.ok) {
				return cursor;
			}
			const pageSize = input.pageSize ?? 50;
			const ordered = [...appointments.values()]
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
				.sort(compareOfficerAppointments)
				.filter(
					(appointment) =>
						cursor.data === null ||
						compareOfficerAppointmentCursor(appointment, cursor.data) > 0,
				)
				.slice(0, pageSize + 1);
			const pageRows = ordered.slice(0, pageSize);
			const last = pageRows.at(-1);
			return errorResult.ok({
				items: pageRows.map(clone),
				nextCursor:
					ordered.length > pageSize && last !== undefined
						? encodeOfficerAppointmentCursor(
								cursorScope,
								officerAppointmentCursorKey(last),
							)
						: null,
			} satisfies OfficerAppointmentListPage);
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
			return errorResult.ok(clone(row));
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
			return errorResult.ok(clone(updated));
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
			return errorResult.ok(clone(updated));
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
			return errorResult.ok(clone(row));
		},
		async listOfficerQualifications(input) {
			return errorResult.ok(
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

function compareStatutoryOffices(
	left: StatutoryOffice,
	right: StatutoryOffice,
): number {
	return (
		left.jurisdictionCode.localeCompare(right.jurisdictionCode) ||
		left.officeTypeCode.localeCompare(right.officeTypeCode) ||
		left.id.localeCompare(right.id)
	);
}

function compareOfficerAppointments(
	left: OfficerAppointment,
	right: OfficerAppointment,
): number {
	return (
		left.statutoryOfficeId.localeCompare(right.statutoryOfficeId) ||
		left.effectiveFrom.localeCompare(right.effectiveFrom) ||
		left.id.localeCompare(right.id)
	);
}

function officerAppointmentCursorKey(
	appointment: OfficerAppointment,
): OfficerAppointmentCursorKey {
	return [
		appointment.statutoryOfficeId,
		appointment.effectiveFrom,
		appointment.id,
	];
}

function compareOfficerAppointmentCursor(
	appointment: OfficerAppointment,
	cursor: OfficerAppointmentCursorKey,
): number {
	return (
		appointment.statutoryOfficeId.localeCompare(cursor[0]) ||
		appointment.effectiveFrom.localeCompare(cursor[1]) ||
		appointment.id.localeCompare(cursor[2])
	);
}

function statutoryOfficeCursorKey(
	office: StatutoryOffice,
): StatutoryOfficeCursorKey {
	return [office.jurisdictionCode, office.officeTypeCode, office.id];
}

function compareStatutoryOfficeCursor(
	office: StatutoryOffice,
	cursor: StatutoryOfficeCursorKey,
): number {
	return (
		office.jurisdictionCode.localeCompare(cursor[0]) ||
		office.officeTypeCode.localeCompare(cursor[1]) ||
		office.id.localeCompare(cursor[2])
	);
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

function conflict(_field: string) {
	return errorResult.fail("CONFLICT", {
		publicMessage:
			"Corporate Administration officer record conflicts with existing history.",
	});
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
