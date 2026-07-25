import { randomUUID } from "node:crypto";

import {
	and,
	caAuthorityMandate,
	caCompanyPremise,
	caGovernanceBody,
	caGovernanceMeeting,
	caGovernanceMembership,
	caOfficerAppointment,
	caResolution,
	db,
	eq,
} from "@afenda/db";
import { fail, failFromUnknown, ok } from "@afenda/errors/result";

import { CA_ERROR_CODE_CONFLICT, caErrorDetails } from "../../error-codes";
import type { GovernanceStore } from "../../ports";
import type {
	CaAuthorityMandate,
	CaCompanyPremise,
	CaGovernanceBody,
	CaGovernanceMeeting,
	CaGovernanceMembership,
	CaOfficerAppointment,
	CaResolution,
} from "../../schemas";

type OfficerRow = typeof caOfficerAppointment.$inferSelect;
type GovernanceBodyRow = typeof caGovernanceBody.$inferSelect;
type GovernanceMembershipRow = typeof caGovernanceMembership.$inferSelect;
type AuthorityMandateRow = typeof caAuthorityMandate.$inferSelect;
type CompanyPremiseRow = typeof caCompanyPremise.$inferSelect;
type GovernanceMeetingRow = typeof caGovernanceMeeting.$inferSelect;
type ResolutionRow = typeof caResolution.$inferSelect;

function mapOfficerAppointment(row: OfficerRow): CaOfficerAppointment {
	return {
		id: row.id,
		organizationId: row.organizationId,
		legalCompanyId: row.legalCompanyId,
		officerRole: row.officerRole as CaOfficerAppointment["officerRole"],
		partyId: row.partyId,
		partyCodeSnapshot: row.partyCodeSnapshot,
		partyNameSnapshot: row.partyNameSnapshot,
		appointedDate: row.appointedDate,
		resignedDate: row.resignedDate,
		authorityLimits: row.authorityLimits,
		status: row.status as CaOfficerAppointment["status"],
		version: row.version,
		createIdempotencyKey: row.createIdempotencyKey,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapGovernanceBody(row: GovernanceBodyRow): CaGovernanceBody {
	return {
		id: row.id,
		organizationId: row.organizationId,
		legalCompanyId: row.legalCompanyId,
		code: row.code,
		normalizedCode: row.normalizedCode,
		bodyType: row.bodyType as CaGovernanceBody["bodyType"],
		displayName: row.displayName,
		status: row.status as CaGovernanceBody["status"],
		version: row.version,
		createIdempotencyKey: row.createIdempotencyKey,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapGovernanceMembership(
	row: GovernanceMembershipRow,
): CaGovernanceMembership {
	return {
		id: row.id,
		organizationId: row.organizationId,
		legalCompanyId: row.legalCompanyId,
		governanceBodyId: row.governanceBodyId,
		memberPartyId: row.memberPartyId,
		memberPartyCodeSnapshot: row.memberPartyCodeSnapshot,
		memberPartyNameSnapshot: row.memberPartyNameSnapshot,
		officerAppointmentId: row.officerAppointmentId,
		roleTitle: row.roleTitle,
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		version: row.version,
		createIdempotencyKey: row.createIdempotencyKey,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapAuthorityMandate(row: AuthorityMandateRow): CaAuthorityMandate {
	return {
		id: row.id,
		organizationId: row.organizationId,
		legalCompanyId: row.legalCompanyId,
		mandateType: row.mandateType as CaAuthorityMandate["mandateType"],
		scopeDescription: row.scopeDescription,
		amountLimit: row.amountLimit != null ? String(row.amountLimit) : null,
		currencyCode: row.currencyCode,
		signingRule: row.signingRule as CaAuthorityMandate["signingRule"],
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		grantEvidenceReference: row.grantEvidenceReference,
		revocationEvidenceReference: row.revocationEvidenceReference,
		status: row.status as CaAuthorityMandate["status"],
		version: row.version,
		createIdempotencyKey: row.createIdempotencyKey,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapCompanyPremise(row: CompanyPremiseRow): CaCompanyPremise {
	return {
		id: row.id,
		organizationId: row.organizationId,
		legalCompanyId: row.legalCompanyId,
		premiseType: row.premiseType as CaCompanyPremise["premiseType"],
		partyAddressId: row.partyAddressId,
		addressLine1Snapshot: row.addressLine1Snapshot,
		addressLine2Snapshot: row.addressLine2Snapshot,
		citySnapshot: row.citySnapshot,
		regionSnapshot: row.regionSnapshot,
		postalCodeSnapshot: row.postalCodeSnapshot,
		countryCodeSnapshot: row.countryCodeSnapshot,
		isPrimary: row.isPrimary,
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		status: row.status as CaCompanyPremise["status"],
		version: row.version,
		createIdempotencyKey: row.createIdempotencyKey,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapGovernanceMeeting(row: GovernanceMeetingRow): CaGovernanceMeeting {
	return {
		id: row.id,
		organizationId: row.organizationId,
		legalCompanyId: row.legalCompanyId,
		governanceBodyId: row.governanceBodyId,
		meetingAt: row.meetingAt,
		quorumResult: row.quorumResult as CaGovernanceMeeting["quorumResult"],
		status: row.status as CaGovernanceMeeting["status"],
		minutesDocumentReference: row.minutesDocumentReference,
		version: row.version,
		createIdempotencyKey: row.createIdempotencyKey,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapResolution(row: ResolutionRow): CaResolution {
	return {
		id: row.id,
		organizationId: row.organizationId,
		legalCompanyId: row.legalCompanyId,
		governanceMeetingId: row.governanceMeetingId,
		resolutionNumber: row.resolutionNumber,
		resolutionYear: row.resolutionYear,
		title: row.title,
		description: row.description,
		status: row.status as CaResolution["status"],
		approvedDate: row.approvedDate,
		supersededById: row.supersededById,
		version: row.version,
		createIdempotencyKey: row.createIdempotencyKey,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function isUniqueViolation(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		error.code === "23505"
	);
}

export function createDrizzleGovernanceStore(): GovernanceStore {
	return {
		async getOfficerByIdempotencyKey(organizationId, idempotencyKey) {
			try {
				const rows = await db
					.select()
					.from(caOfficerAppointment)
					.where(
						and(
							eq(caOfficerAppointment.organizationId, organizationId),
							eq(caOfficerAppointment.createIdempotencyKey, idempotencyKey),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapOfficerAppointment(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to load officer by idempotency key",
				);
			}
		},
		async createOfficerAppointment(record) {
			try {
				const existing = await db
					.select()
					.from(caOfficerAppointment)
					.where(
						and(
							eq(caOfficerAppointment.organizationId, record.organizationId),
							eq(
								caOfficerAppointment.createIdempotencyKey,
								record.createIdempotencyKey,
							),
						),
					)
					.limit(1);
				if (existing[0]) {
					return ok(mapOfficerAppointment(existing[0]));
				}
				const rows = await db
					.insert(caOfficerAppointment)
					.values({
						id: randomUUID(),
						organizationId: record.organizationId,
						legalCompanyId: record.legalCompanyId,
						officerRole: record.officerRole,
						partyId: record.partyId,
						partyCodeSnapshot: record.partyCodeSnapshot,
						partyNameSnapshot: record.partyNameSnapshot,
						appointedDate: record.appointedDate,
						resignedDate: record.resignedDate,
						authorityLimits: record.authorityLimits,
						status: record.status,
						version: 1,
						createIdempotencyKey: record.createIdempotencyKey,
						createdBy: record.createdBy,
						updatedBy: record.updatedBy,
					})
					.returning();
				const row = rows[0];
				if (!row) {
					return fail("INTERNAL_ERROR", "Failed to create officer appointment");
				}
				return ok(mapOfficerAppointment(row));
			} catch (error) {
				if (isUniqueViolation(error)) {
					const rows = await db
						.select()
						.from(caOfficerAppointment)
						.where(
							and(
								eq(caOfficerAppointment.organizationId, record.organizationId),
								eq(
									caOfficerAppointment.createIdempotencyKey,
									record.createIdempotencyKey,
								),
							),
						)
						.limit(1);
					if (rows[0]) {
						return ok(mapOfficerAppointment(rows[0]));
					}
				}
				return failFromUnknown(error, "Failed to create officer appointment");
			}
		},
		async getOfficerAppointmentById(organizationId, officerAppointmentId) {
			try {
				const rows = await db
					.select()
					.from(caOfficerAppointment)
					.where(
						and(
							eq(caOfficerAppointment.organizationId, organizationId),
							eq(caOfficerAppointment.id, officerAppointmentId),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapOfficerAppointment(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(error, "Failed to load officer appointment");
			}
		},
		async listOfficerAppointments(organizationId, legalCompanyId) {
			try {
				const rows = await db
					.select()
					.from(caOfficerAppointment)
					.where(
						and(
							eq(caOfficerAppointment.organizationId, organizationId),
							eq(caOfficerAppointment.legalCompanyId, legalCompanyId),
						),
					);
				return ok(rows.map(mapOfficerAppointment));
			} catch (error) {
				return failFromUnknown(error, "Failed to list officer appointments");
			}
		},
		async getGovernanceBodyByIdempotencyKey(organizationId, idempotencyKey) {
			try {
				const rows = await db
					.select()
					.from(caGovernanceBody)
					.where(
						and(
							eq(caGovernanceBody.organizationId, organizationId),
							eq(caGovernanceBody.createIdempotencyKey, idempotencyKey),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapGovernanceBody(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to load governance body by idempotency key",
				);
			}
		},
		async createGovernanceBody(record) {
			try {
				const existing = await db
					.select()
					.from(caGovernanceBody)
					.where(
						and(
							eq(caGovernanceBody.organizationId, record.organizationId),
							eq(
								caGovernanceBody.createIdempotencyKey,
								record.createIdempotencyKey,
							),
						),
					)
					.limit(1);
				if (existing[0]) {
					return ok(mapGovernanceBody(existing[0]));
				}
				const rows = await db
					.insert(caGovernanceBody)
					.values({
						id: randomUUID(),
						organizationId: record.organizationId,
						legalCompanyId: record.legalCompanyId,
						code: record.code,
						normalizedCode: record.normalizedCode,
						bodyType: record.bodyType,
						displayName: record.displayName,
						status: record.status,
						version: 1,
						createIdempotencyKey: record.createIdempotencyKey,
						createdBy: record.createdBy,
						updatedBy: record.updatedBy,
					})
					.returning();
				const row = rows[0];
				if (!row) {
					return fail("INTERNAL_ERROR", "Failed to create governance body");
				}
				return ok(mapGovernanceBody(row));
			} catch (error) {
				if (isUniqueViolation(error)) {
					const byIdempotency = await db
						.select()
						.from(caGovernanceBody)
						.where(
							and(
								eq(caGovernanceBody.organizationId, record.organizationId),
								eq(
									caGovernanceBody.createIdempotencyKey,
									record.createIdempotencyKey,
								),
							),
						)
						.limit(1);
					if (byIdempotency[0]) {
						return ok(mapGovernanceBody(byIdempotency[0]));
					}
					return fail(
						"CONFLICT",
						"Governance body code already exists",
						caErrorDetails(CA_ERROR_CODE_CONFLICT),
					);
				}
				return failFromUnknown(error, "Failed to create governance body");
			}
		},
		async getGovernanceBodyById(organizationId, governanceBodyId) {
			try {
				const rows = await db
					.select()
					.from(caGovernanceBody)
					.where(
						and(
							eq(caGovernanceBody.organizationId, organizationId),
							eq(caGovernanceBody.id, governanceBodyId),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapGovernanceBody(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(error, "Failed to load governance body");
			}
		},
		async listGovernanceBodies(organizationId, legalCompanyId) {
			try {
				const rows = await db
					.select()
					.from(caGovernanceBody)
					.where(
						and(
							eq(caGovernanceBody.organizationId, organizationId),
							eq(caGovernanceBody.legalCompanyId, legalCompanyId),
						),
					);
				return ok(rows.map(mapGovernanceBody));
			} catch (error) {
				return failFromUnknown(error, "Failed to list governance bodies");
			}
		},
		async getGovernanceMembershipByIdempotencyKey(
			organizationId,
			idempotencyKey,
		) {
			try {
				const rows = await db
					.select()
					.from(caGovernanceMembership)
					.where(
						and(
							eq(caGovernanceMembership.organizationId, organizationId),
							eq(caGovernanceMembership.createIdempotencyKey, idempotencyKey),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapGovernanceMembership(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to load governance membership by idempotency key",
				);
			}
		},
		async createGovernanceMembership(record) {
			try {
				const existing = await db
					.select()
					.from(caGovernanceMembership)
					.where(
						and(
							eq(caGovernanceMembership.organizationId, record.organizationId),
							eq(
								caGovernanceMembership.createIdempotencyKey,
								record.createIdempotencyKey,
							),
						),
					)
					.limit(1);
				if (existing[0]) {
					return ok(mapGovernanceMembership(existing[0]));
				}
				const rows = await db
					.insert(caGovernanceMembership)
					.values({
						id: randomUUID(),
						organizationId: record.organizationId,
						legalCompanyId: record.legalCompanyId,
						governanceBodyId: record.governanceBodyId,
						memberPartyId: record.memberPartyId,
						memberPartyCodeSnapshot: record.memberPartyCodeSnapshot,
						memberPartyNameSnapshot: record.memberPartyNameSnapshot,
						officerAppointmentId: record.officerAppointmentId,
						roleTitle: record.roleTitle,
						effectiveFrom: record.effectiveFrom,
						effectiveTo: record.effectiveTo,
						version: 1,
						createIdempotencyKey: record.createIdempotencyKey,
						createdBy: record.createdBy,
						updatedBy: record.updatedBy,
					})
					.returning();
				const row = rows[0];
				if (!row) {
					return fail(
						"INTERNAL_ERROR",
						"Failed to create governance membership",
					);
				}
				return ok(mapGovernanceMembership(row));
			} catch (error) {
				if (isUniqueViolation(error)) {
					const rows = await db
						.select()
						.from(caGovernanceMembership)
						.where(
							and(
								eq(
									caGovernanceMembership.organizationId,
									record.organizationId,
								),
								eq(
									caGovernanceMembership.createIdempotencyKey,
									record.createIdempotencyKey,
								),
							),
						)
						.limit(1);
					if (rows[0]) {
						return ok(mapGovernanceMembership(rows[0]));
					}
				}
				return failFromUnknown(error, "Failed to create governance membership");
			}
		},
		async getGovernanceMembershipById(organizationId, governanceMembershipId) {
			try {
				const rows = await db
					.select()
					.from(caGovernanceMembership)
					.where(
						and(
							eq(caGovernanceMembership.organizationId, organizationId),
							eq(caGovernanceMembership.id, governanceMembershipId),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapGovernanceMembership(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(error, "Failed to load governance membership");
			}
		},
		async listGovernanceMemberships(organizationId, legalCompanyId) {
			try {
				const rows = await db
					.select()
					.from(caGovernanceMembership)
					.where(
						and(
							eq(caGovernanceMembership.organizationId, organizationId),
							eq(caGovernanceMembership.legalCompanyId, legalCompanyId),
						),
					);
				return ok(rows.map(mapGovernanceMembership));
			} catch (error) {
				return failFromUnknown(error, "Failed to list governance memberships");
			}
		},
		async getAuthorityMandateByIdempotencyKey(organizationId, idempotencyKey) {
			try {
				const rows = await db
					.select()
					.from(caAuthorityMandate)
					.where(
						and(
							eq(caAuthorityMandate.organizationId, organizationId),
							eq(caAuthorityMandate.createIdempotencyKey, idempotencyKey),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapAuthorityMandate(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to load authority mandate by idempotency key",
				);
			}
		},
		async createAuthorityMandate(record) {
			try {
				const existing = await db
					.select()
					.from(caAuthorityMandate)
					.where(
						and(
							eq(caAuthorityMandate.organizationId, record.organizationId),
							eq(
								caAuthorityMandate.createIdempotencyKey,
								record.createIdempotencyKey,
							),
						),
					)
					.limit(1);
				if (existing[0]) {
					return ok(mapAuthorityMandate(existing[0]));
				}
				const rows = await db
					.insert(caAuthorityMandate)
					.values({
						id: randomUUID(),
						organizationId: record.organizationId,
						legalCompanyId: record.legalCompanyId,
						mandateType: record.mandateType,
						scopeDescription: record.scopeDescription,
						amountLimit: record.amountLimit,
						currencyCode: record.currencyCode,
						signingRule: record.signingRule,
						effectiveFrom: record.effectiveFrom,
						effectiveTo: record.effectiveTo,
						grantEvidenceReference: record.grantEvidenceReference,
						revocationEvidenceReference: record.revocationEvidenceReference,
						status: record.status,
						version: 1,
						createIdempotencyKey: record.createIdempotencyKey,
						createdBy: record.createdBy,
						updatedBy: record.updatedBy,
					})
					.returning();
				const row = rows[0];
				if (!row) {
					return fail("INTERNAL_ERROR", "Failed to create authority mandate");
				}
				return ok(mapAuthorityMandate(row));
			} catch (error) {
				if (isUniqueViolation(error)) {
					const rows = await db
						.select()
						.from(caAuthorityMandate)
						.where(
							and(
								eq(caAuthorityMandate.organizationId, record.organizationId),
								eq(
									caAuthorityMandate.createIdempotencyKey,
									record.createIdempotencyKey,
								),
							),
						)
						.limit(1);
					if (rows[0]) {
						return ok(mapAuthorityMandate(rows[0]));
					}
				}
				return failFromUnknown(error, "Failed to create authority mandate");
			}
		},
		async getAuthorityMandateById(organizationId, authorityMandateId) {
			try {
				const rows = await db
					.select()
					.from(caAuthorityMandate)
					.where(
						and(
							eq(caAuthorityMandate.organizationId, organizationId),
							eq(caAuthorityMandate.id, authorityMandateId),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapAuthorityMandate(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(error, "Failed to load authority mandate");
			}
		},
		async listAuthorityMandates(organizationId, legalCompanyId) {
			try {
				const rows = await db
					.select()
					.from(caAuthorityMandate)
					.where(
						and(
							eq(caAuthorityMandate.organizationId, organizationId),
							eq(caAuthorityMandate.legalCompanyId, legalCompanyId),
						),
					);
				return ok(rows.map(mapAuthorityMandate));
			} catch (error) {
				return failFromUnknown(error, "Failed to list authority mandates");
			}
		},
		async getCompanyPremiseByIdempotencyKey(organizationId, idempotencyKey) {
			try {
				const rows = await db
					.select()
					.from(caCompanyPremise)
					.where(
						and(
							eq(caCompanyPremise.organizationId, organizationId),
							eq(caCompanyPremise.createIdempotencyKey, idempotencyKey),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapCompanyPremise(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to load company premise by idempotency key",
				);
			}
		},
		async createCompanyPremise(record) {
			try {
				const existing = await db
					.select()
					.from(caCompanyPremise)
					.where(
						and(
							eq(caCompanyPremise.organizationId, record.organizationId),
							eq(
								caCompanyPremise.createIdempotencyKey,
								record.createIdempotencyKey,
							),
						),
					)
					.limit(1);
				if (existing[0]) {
					return ok(mapCompanyPremise(existing[0]));
				}
				const rows = await db
					.insert(caCompanyPremise)
					.values({
						id: randomUUID(),
						organizationId: record.organizationId,
						legalCompanyId: record.legalCompanyId,
						premiseType: record.premiseType,
						partyAddressId: record.partyAddressId,
						addressLine1Snapshot: record.addressLine1Snapshot,
						addressLine2Snapshot: record.addressLine2Snapshot,
						citySnapshot: record.citySnapshot,
						regionSnapshot: record.regionSnapshot,
						postalCodeSnapshot: record.postalCodeSnapshot,
						countryCodeSnapshot: record.countryCodeSnapshot,
						isPrimary: record.isPrimary,
						effectiveFrom: record.effectiveFrom,
						effectiveTo: record.effectiveTo,
						status: record.status,
						version: 1,
						createIdempotencyKey: record.createIdempotencyKey,
						createdBy: record.createdBy,
						updatedBy: record.updatedBy,
					})
					.returning();
				const row = rows[0];
				if (!row) {
					return fail("INTERNAL_ERROR", "Failed to create company premise");
				}
				return ok(mapCompanyPremise(row));
			} catch (error) {
				if (isUniqueViolation(error)) {
					const rows = await db
						.select()
						.from(caCompanyPremise)
						.where(
							and(
								eq(caCompanyPremise.organizationId, record.organizationId),
								eq(
									caCompanyPremise.createIdempotencyKey,
									record.createIdempotencyKey,
								),
							),
						)
						.limit(1);
					if (rows[0]) {
						return ok(mapCompanyPremise(rows[0]));
					}
				}
				return failFromUnknown(error, "Failed to create company premise");
			}
		},
		async getCompanyPremiseById(organizationId, companyPremiseId) {
			try {
				const rows = await db
					.select()
					.from(caCompanyPremise)
					.where(
						and(
							eq(caCompanyPremise.organizationId, organizationId),
							eq(caCompanyPremise.id, companyPremiseId),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapCompanyPremise(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(error, "Failed to load company premise");
			}
		},
		async listCompanyPremises(organizationId, legalCompanyId) {
			try {
				const rows = await db
					.select()
					.from(caCompanyPremise)
					.where(
						and(
							eq(caCompanyPremise.organizationId, organizationId),
							eq(caCompanyPremise.legalCompanyId, legalCompanyId),
						),
					);
				return ok(rows.map(mapCompanyPremise));
			} catch (error) {
				return failFromUnknown(error, "Failed to list company premises");
			}
		},
		async getGovernanceMeetingByIdempotencyKey(organizationId, idempotencyKey) {
			try {
				const rows = await db
					.select()
					.from(caGovernanceMeeting)
					.where(
						and(
							eq(caGovernanceMeeting.organizationId, organizationId),
							eq(caGovernanceMeeting.createIdempotencyKey, idempotencyKey),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapGovernanceMeeting(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to load governance meeting by idempotency key",
				);
			}
		},
		async createGovernanceMeeting(record) {
			try {
				const existing = await db
					.select()
					.from(caGovernanceMeeting)
					.where(
						and(
							eq(caGovernanceMeeting.organizationId, record.organizationId),
							eq(
								caGovernanceMeeting.createIdempotencyKey,
								record.createIdempotencyKey,
							),
						),
					)
					.limit(1);
				if (existing[0]) {
					return ok(mapGovernanceMeeting(existing[0]));
				}
				const rows = await db
					.insert(caGovernanceMeeting)
					.values({
						id: randomUUID(),
						organizationId: record.organizationId,
						legalCompanyId: record.legalCompanyId,
						governanceBodyId: record.governanceBodyId,
						meetingAt: record.meetingAt,
						quorumResult: record.quorumResult,
						status: record.status,
						minutesDocumentReference: record.minutesDocumentReference,
						version: 1,
						createIdempotencyKey: record.createIdempotencyKey,
						createdBy: record.createdBy,
						updatedBy: record.updatedBy,
					})
					.returning();
				const row = rows[0];
				if (!row) {
					return fail("INTERNAL_ERROR", "Failed to create governance meeting");
				}
				return ok(mapGovernanceMeeting(row));
			} catch (error) {
				if (isUniqueViolation(error)) {
					const rows = await db
						.select()
						.from(caGovernanceMeeting)
						.where(
							and(
								eq(caGovernanceMeeting.organizationId, record.organizationId),
								eq(
									caGovernanceMeeting.createIdempotencyKey,
									record.createIdempotencyKey,
								),
							),
						)
						.limit(1);
					if (rows[0]) {
						return ok(mapGovernanceMeeting(rows[0]));
					}
				}
				return failFromUnknown(error, "Failed to create governance meeting");
			}
		},
		async getGovernanceMeetingById(organizationId, governanceMeetingId) {
			try {
				const rows = await db
					.select()
					.from(caGovernanceMeeting)
					.where(
						and(
							eq(caGovernanceMeeting.organizationId, organizationId),
							eq(caGovernanceMeeting.id, governanceMeetingId),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapGovernanceMeeting(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(error, "Failed to load governance meeting");
			}
		},
		async listGovernanceMeetings(organizationId, legalCompanyId) {
			try {
				const rows = await db
					.select()
					.from(caGovernanceMeeting)
					.where(
						and(
							eq(caGovernanceMeeting.organizationId, organizationId),
							eq(caGovernanceMeeting.legalCompanyId, legalCompanyId),
						),
					);
				return ok(rows.map(mapGovernanceMeeting));
			} catch (error) {
				return failFromUnknown(error, "Failed to list governance meetings");
			}
		},
		async getResolutionByIdempotencyKey(organizationId, idempotencyKey) {
			try {
				const rows = await db
					.select()
					.from(caResolution)
					.where(
						and(
							eq(caResolution.organizationId, organizationId),
							eq(caResolution.createIdempotencyKey, idempotencyKey),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapResolution(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to load resolution by idempotency key",
				);
			}
		},
		async createResolution(record) {
			try {
				const existing = await db
					.select()
					.from(caResolution)
					.where(
						and(
							eq(caResolution.organizationId, record.organizationId),
							eq(
								caResolution.createIdempotencyKey,
								record.createIdempotencyKey,
							),
						),
					)
					.limit(1);
				if (existing[0]) {
					return ok(mapResolution(existing[0]));
				}
				const rows = await db
					.insert(caResolution)
					.values({
						id: randomUUID(),
						organizationId: record.organizationId,
						legalCompanyId: record.legalCompanyId,
						governanceMeetingId: record.governanceMeetingId,
						resolutionNumber: record.resolutionNumber,
						resolutionYear: record.resolutionYear,
						title: record.title,
						description: record.description,
						status: record.status,
						approvedDate: record.approvedDate,
						supersededById: record.supersededById,
						version: 1,
						createIdempotencyKey: record.createIdempotencyKey,
						createdBy: record.createdBy,
						updatedBy: record.updatedBy,
					})
					.returning();
				const row = rows[0];
				if (!row) {
					return fail("INTERNAL_ERROR", "Failed to create resolution");
				}
				return ok(mapResolution(row));
			} catch (error) {
				if (isUniqueViolation(error)) {
					const byIdempotency = await db
						.select()
						.from(caResolution)
						.where(
							and(
								eq(caResolution.organizationId, record.organizationId),
								eq(
									caResolution.createIdempotencyKey,
									record.createIdempotencyKey,
								),
							),
						)
						.limit(1);
					if (byIdempotency[0]) {
						return ok(mapResolution(byIdempotency[0]));
					}
					return fail(
						"CONFLICT",
						"Resolution number already exists for year",
						caErrorDetails(CA_ERROR_CODE_CONFLICT),
					);
				}
				return failFromUnknown(error, "Failed to create resolution");
			}
		},
		async getResolutionById(organizationId, resolutionId) {
			try {
				const rows = await db
					.select()
					.from(caResolution)
					.where(
						and(
							eq(caResolution.organizationId, organizationId),
							eq(caResolution.id, resolutionId),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapResolution(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(error, "Failed to load resolution");
			}
		},
		async listResolutions(organizationId, legalCompanyId) {
			try {
				const rows = await db
					.select()
					.from(caResolution)
					.where(
						and(
							eq(caResolution.organizationId, organizationId),
							eq(caResolution.legalCompanyId, legalCompanyId),
						),
					);
				return ok(rows.map(mapResolution));
			} catch (error) {
				return failFromUnknown(error, "Failed to list resolutions");
			}
		},
	};
}
