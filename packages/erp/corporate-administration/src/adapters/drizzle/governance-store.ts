import { randomUUID } from "node:crypto";

import {
	and,
	asc,
	caAuthorityMandate,
	caAuthorityMandateHolder,
	caCompanyPremise,
	caGovernanceBody,
	caGovernanceMeeting,
	caGovernanceMembership,
	caOfficerAppointment,
	caResolution,
	db,
	desc,
	eq,
	type NeonHttpSql,
	runNeonHttpTransaction,
} from "@afenda/db";
import { fail, failFromUnknown, ok, type Result } from "@afenda/errors/result";

import {
	CA_ERROR_CODE_CONFLICT,
	caErrorDetails,
} from "../../error-codes";
import {
	CorporateAdministrationVersionConflictError,
	mapCorporateAdministrationStoreError,
} from "../../store/store-errors";
import {
	idempotencyFingerprintConflict,
	replayIdempotencyFingerprintMapped,
} from "../../shared/idempotency-replay";
import type { GovernanceMutationMeta, GovernanceStore } from "../../ports";
import type {
	CaAuthorityMandate,
	CaAuthorityMandateDetail,
	CaAuthorityMandateHolder,
	CaCompanyPremise,
	CaGovernanceBody,
	CaGovernanceMeeting,
	CaGovernanceMembership,
	CaOfficerAppointment,
	CaResolution,
} from "../../schemas";
import type { GovernanceEntityType } from "../../shared/governance-mutation-facts";

type OfficerRow = typeof caOfficerAppointment.$inferSelect;
type GovernanceBodyRow = typeof caGovernanceBody.$inferSelect;
type GovernanceMembershipRow = typeof caGovernanceMembership.$inferSelect;
type AuthorityMandateRow = typeof caAuthorityMandate.$inferSelect;
type AuthorityMandateHolderRow = typeof caAuthorityMandateHolder.$inferSelect;
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
		requestFingerprint: row.requestFingerprint,
		supersedesOfficerAppointmentId: row.supersedesOfficerAppointmentId,
		amendmentReason: row.amendmentReason,
		endReason: row.endReason,
		endEvidenceReference: row.endEvidenceReference,
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
		requestFingerprint: row.requestFingerprint,
		retiredAt: row.retiredAt,
		retiredBy: row.retiredBy,
		retirementReason: row.retirementReason,
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
		requestFingerprint: row.requestFingerprint,
		endReason: row.endReason,
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
		minimumSignatories: row.minimumSignatories,
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		grantEvidenceReference: row.grantEvidenceReference,
		revocationEvidenceReference: row.revocationEvidenceReference,
		status: row.status as CaAuthorityMandate["status"],
		version: row.version,
		createIdempotencyKey: row.createIdempotencyKey,
		requestFingerprint: row.requestFingerprint,
		supersedesAuthorityMandateId: row.supersedesAuthorityMandateId,
		amendmentReason: row.amendmentReason,
		revocationReason: row.revocationReason,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapAuthorityMandateHolder(
	row: AuthorityMandateHolderRow,
): CaAuthorityMandateHolder {
	return {
		id: row.id,
		organizationId: row.organizationId,
		legalCompanyId: row.legalCompanyId,
		authorityMandateId: row.authorityMandateId,
		holderKind: row.holderKind as CaAuthorityMandateHolder["holderKind"],
		partyId: row.partyId,
		partyCodeSnapshot: row.partyCodeSnapshot,
		partyNameSnapshot: row.partyNameSnapshot,
		officerAppointmentId: row.officerAppointmentId,
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		createdBy: row.createdBy,
		createdAt: row.createdAt,
	};
}

function mapAuthorityMandateDetail(
	row: AuthorityMandateRow,
	holders: AuthorityMandateHolderRow[],
): CaAuthorityMandateDetail {
	return {
		...mapAuthorityMandate(row),
		holders: holders.map(mapAuthorityMandateHolder),
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
		requestFingerprint: row.requestFingerprint,
		supersedesCompanyPremiseId: row.supersedesCompanyPremiseId,
		amendmentReason: row.amendmentReason,
		retirementReason: row.retirementReason,
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
		requestFingerprint: row.requestFingerprint,
		correctsGovernanceMeetingId: row.correctsGovernanceMeetingId,
		correctionReason: row.correctionReason,
		closedAt: row.closedAt,
		closedBy: row.closedBy,
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
		approvalEvidenceReference: row.approvalEvidenceReference,
		supersedesResolutionId: row.supersedesResolutionId,
		supersededById: row.supersededById,
		supersededAt: row.supersededAt,
		revokedDate: row.revokedDate,
		revocationReason: row.revocationReason,
		revocationEvidenceReference: row.revocationEvidenceReference,
		version: row.version,
		createIdempotencyKey: row.createIdempotencyKey,
		requestFingerprint: row.requestFingerprint,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function versionConflict<Value>(input?: {
	organizationId: string;
	aggregateId: string;
	expectedVersion: number;
}): Result<Value> {
	return mapCorporateAdministrationStoreError(
		new CorporateAdministrationVersionConflictError({
			organizationId: input?.organizationId ?? "",
			aggregateId: input?.aggregateId ?? "",
			expectedVersion: input?.expectedVersion ?? 0,
		}),
	);
}

function isUniqueViolation(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		error.code === "23505"
	);
}

type GovernanceFactsInput = {
	auditId: string;
	eventId: string;
	actorUserId: string;
	meta: GovernanceMutationMeta;
	entityType: GovernanceEntityType;
	auditEntity: string;
	action: "CREATE" | "UPDATE";
};

function officerLockKey(
	organizationId: string,
	legalCompanyId: string,
	partyId: string | null | undefined,
	officerRole: string,
): string {
	return `${organizationId}:${legalCompanyId}:officer:${partyId ?? "none"}:${officerRole}`;
}

function governanceBodyLockKey(
	organizationId: string,
	legalCompanyId: string,
	normalizedCode: string,
): string {
	return `${organizationId}:${legalCompanyId}:body:${normalizedCode}`;
}

function governanceMembershipLockKey(
	organizationId: string,
	legalCompanyId: string,
	governanceBodyId: string,
): string {
	return `${organizationId}:${legalCompanyId}:membership:${governanceBodyId}`;
}

function authorityMandateLockKey(
	organizationId: string,
	legalCompanyId: string,
	idempotencyKey: string,
): string {
	return `${organizationId}:${legalCompanyId}:mandate:${idempotencyKey}`;
}

function companyPremisePrimaryLockKey(
	organizationId: string,
	legalCompanyId: string,
): string {
	return `${organizationId}:${legalCompanyId}:premise:primary`;
}

function resolutionLockKey(
	organizationId: string,
	legalCompanyId: string,
	resolutionYear: number,
	resolutionNumber: string,
): string {
	return `${organizationId}:${legalCompanyId}:resolution:${resolutionYear}:${resolutionNumber}`;
}

function governanceFactsCtes(
	sql: NeonHttpSql,
	sourceCte: "inserted" | "updated" | "updated_current" | "inserted_successor",
	input: GovernanceFactsInput,
) {
	const {
		auditId,
		eventId,
		actorUserId,
		meta,
		entityType,
		auditEntity,
		action,
	} = input;
	const source = sql.unsafe(sourceCte);
	return sql`
		audited AS (
			INSERT INTO platform_audit_log (
				id, organization_id, actor_user_id, correlation_id, module,
				entity, entity_id, action, changes
			)
			SELECT
				${auditId}::uuid, organization_id, ${actorUserId}::text, ${meta.correlationId}::text,
				'corporate-administration', ${auditEntity}::text, id::text, ${action}::text, '[]'::jsonb
			FROM ${source}
			RETURNING id
		),
		emitted AS (
			INSERT INTO platform_domain_event (
				id, organization_id, type, source_module, correlation_id,
				actor_user_id, payload, status, attempts
			)
			SELECT
				${eventId}::uuid, organization_id, ${meta.eventType}::text, 'corporate-administration',
				${meta.correlationId}::text, ${actorUserId}::text,
				jsonb_build_object(
					'organizationId', organization_id,
					'legalCompanyId', legal_company_id,
					'entityType', ${entityType}::text,
					'entityId', id,
					'version', version,
					'actorId', ${actorUserId}::text,
					'correlationId', ${meta.correlationId}::text,
					'status', status
				), 'pending', 0
			FROM ${source}
			RETURNING id
		)
	`;
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
		async createOfficerAppointment(record, _ports, meta) {
			const id = randomUUID();
			const auditId = randomUUID();
			const eventId = randomUUID();
			const lockKey = officerLockKey(
				record.organizationId,
				record.legalCompanyId,
				record.partyId,
				record.officerRole,
			);
			const factsInput: GovernanceFactsInput = {
				auditId,
				eventId,
				actorUserId: record.createdBy,
				meta,
				entityType: "officer_appointment",
				auditEntity: "officer_appointment",
				action: "CREATE",
			};
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
					return replayIdempotencyFingerprintMapped(
						existing[0],
						record.requestFingerprint,
						mapOfficerAppointment,
					);
				}
				const [, rows] = await runNeonHttpTransaction<
					[unknown[], OfficerRow[]]
				>((sql) => [
					sql`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`,
					sql`
						WITH inserted AS (
							INSERT INTO ca_officer_appointment (
								id, organization_id, legal_company_id, officer_role, party_id,
								party_code_snapshot, party_name_snapshot, appointed_date, resigned_date,
								authority_limits, status, version, create_idempotency_key, request_fingerprint,
								supersedes_officer_appointment_id, amendment_reason, end_reason,
								end_evidence_reference, created_by, updated_by
							)
							SELECT
								${id}::uuid, ${record.organizationId}::text, ${record.legalCompanyId}::uuid,
								${record.officerRole}::text, ${record.partyId}::uuid,
								${record.partyCodeSnapshot}::text, ${record.partyNameSnapshot}::text,
								${record.appointedDate}::date, ${record.resignedDate}::date,
								${record.authorityLimits}::text, ${record.status}::text, 1,
								${record.createIdempotencyKey}::text, ${record.requestFingerprint}::text,
								${record.supersedesOfficerAppointmentId}::uuid, ${record.amendmentReason}::text,
								${record.endReason}::text, ${record.endEvidenceReference}::text,
								${record.createdBy}::text, ${record.updatedBy}::text
							WHERE NOT EXISTS (
								SELECT 1 FROM ca_officer_appointment existing
								WHERE existing.organization_id = ${record.organizationId}
									AND existing.create_idempotency_key = ${record.createIdempotencyKey}
							)
							RETURNING *
						),
						${governanceFactsCtes(sql, "inserted", factsInput)}
						SELECT inserted.* FROM inserted, audited, emitted
					`,
				]);
				const row = rows[0];
				if (!row) {
					const replay = await db
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
					if (replay[0]) {
						return replayIdempotencyFingerprintMapped(
							replay[0],
							record.requestFingerprint,
							mapOfficerAppointment,
						);
					}
				}
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
						return replayIdempotencyFingerprintMapped(
							rows[0],
							record.requestFingerprint,
							mapOfficerAppointment,
						);
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
					)
					.orderBy(
						asc(caOfficerAppointment.appointedDate),
						asc(caOfficerAppointment.id),
					);
				return ok(rows.map(mapOfficerAppointment));
			} catch (error) {
				return failFromUnknown(error, "Failed to list officer appointments");
			}
		},
		async supersedeOfficerAppointment(
			current,
			replacement,
			expectedVersion,
			_ports,
			meta,
		) {
			const successorId = randomUUID();
			const updateFacts: GovernanceFactsInput = {
				auditId: randomUUID(),
				eventId: randomUUID(),
				actorUserId: current.updatedBy,
				meta,
				entityType: "officer_appointment",
				auditEntity: "officer_appointment",
				action: "UPDATE",
			};
			const createFacts: GovernanceFactsInput = {
				auditId: randomUUID(),
				eventId: randomUUID(),
				actorUserId: replacement.createdBy,
				meta,
				entityType: "officer_appointment",
				auditEntity: "officer_appointment",
				action: "CREATE",
			};
			const lockKey = officerLockKey(
				replacement.organizationId,
				replacement.legalCompanyId,
				replacement.partyId,
				replacement.officerRole,
			);
			try {
				const [, rows] = await runNeonHttpTransaction<
					[unknown[], OfficerRow[]]
				>((sql) => [
					sql`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`,
					sql`
						WITH updated_current AS (
							UPDATE ca_officer_appointment
							SET
								resigned_date = ${current.resignedDate}::date,
								status = ${current.status}::text,
								end_reason = ${current.endReason}::text,
								end_evidence_reference = ${current.endEvidenceReference}::text,
								updated_by = ${current.updatedBy}::text,
								version = ${expectedVersion + 1},
								updated_at = now()
							WHERE organization_id = ${current.organizationId}
								AND id = ${current.id}
								AND version = ${expectedVersion}
							RETURNING *
						),
						audited_current AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module,
								entity, entity_id, action, changes
							)
							SELECT
								${updateFacts.auditId}::uuid, organization_id, ${updateFacts.actorUserId}::text,
								${updateFacts.meta.correlationId}::text, 'corporate-administration',
								${updateFacts.auditEntity}::text, id::text, ${updateFacts.action}::text, '[]'::jsonb
							FROM updated_current
							RETURNING id
						),
						emitted_current AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
							)
							SELECT
								${updateFacts.eventId}::uuid, organization_id, ${updateFacts.meta.eventType}::text,
								'corporate-administration', ${updateFacts.meta.correlationId}::text,
								${updateFacts.actorUserId}::text,
								jsonb_build_object(
									'organizationId', organization_id,
									'legalCompanyId', legal_company_id,
									'entityType', ${updateFacts.entityType}::text,
									'entityId', id,
									'version', version,
									'actorId', ${updateFacts.actorUserId}::text,
									'correlationId', ${updateFacts.meta.correlationId}::text,
									'status', status
								), 'pending', 0
							FROM updated_current
							RETURNING id
						),
						inserted_successor AS (
							INSERT INTO ca_officer_appointment (
								id, organization_id, legal_company_id, officer_role, party_id,
								party_code_snapshot, party_name_snapshot, appointed_date, resigned_date,
								authority_limits, status, version, create_idempotency_key, request_fingerprint,
								supersedes_officer_appointment_id, amendment_reason, end_reason,
								end_evidence_reference, created_by, updated_by
							)
							SELECT
								${successorId}::uuid, ${replacement.organizationId}::text, ${replacement.legalCompanyId}::uuid,
								${replacement.officerRole}::text, ${replacement.partyId}::uuid,
								${replacement.partyCodeSnapshot}::text, ${replacement.partyNameSnapshot}::text,
								${replacement.appointedDate}::date, ${replacement.resignedDate}::date,
								${replacement.authorityLimits}::text, ${replacement.status}::text, 1,
								${replacement.createIdempotencyKey}::text, ${replacement.requestFingerprint}::text,
								${replacement.supersedesOfficerAppointmentId}::uuid, ${replacement.amendmentReason}::text,
								${replacement.endReason}::text, ${replacement.endEvidenceReference}::text,
								${replacement.createdBy}::text, ${replacement.updatedBy}::text
							FROM updated_current
							RETURNING *
						),
						${governanceFactsCtes(sql, "inserted_successor", createFacts)}
						SELECT inserted_successor.* FROM inserted_successor, updated_current, audited_current, emitted_current, audited, emitted
					`,
				]);
				const row = rows[0];
				if (!row) return versionConflict();
				return ok(mapOfficerAppointment(row));
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to supersede officer appointment",
				);
			}
		},
		async endOfficerAppointment(record, expectedVersion, _ports, meta) {
			const factsInput: GovernanceFactsInput = {
				auditId: randomUUID(),
				eventId: randomUUID(),
				actorUserId: record.updatedBy,
				meta,
				entityType: "officer_appointment",
				auditEntity: "officer_appointment",
				action: "UPDATE",
			};
			try {
				const [rows] = await runNeonHttpTransaction<[OfficerRow[]]>((sql) => [
					sql`
						WITH updated AS (
							UPDATE ca_officer_appointment
							SET
								resigned_date = ${record.resignedDate}::date,
								status = ${record.status}::text,
								end_reason = ${record.endReason}::text,
								end_evidence_reference = ${record.endEvidenceReference}::text,
								updated_by = ${record.updatedBy}::text,
								version = ${expectedVersion + 1},
								updated_at = now()
							WHERE organization_id = ${record.organizationId}
								AND id = ${record.id}
								AND version = ${expectedVersion}
							RETURNING *
						),
						${governanceFactsCtes(sql, "updated", factsInput)}
						SELECT updated.* FROM updated, audited, emitted
					`,
				]);
				return rows[0] ? ok(mapOfficerAppointment(rows[0])) : versionConflict();
			} catch (error) {
				return failFromUnknown(error, "Failed to end officer appointment");
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
		async createGovernanceBody(record, _ports, meta) {
			const id = randomUUID();
			const auditId = randomUUID();
			const eventId = randomUUID();
			const lockKey = governanceBodyLockKey(
				record.organizationId,
				record.legalCompanyId,
				record.normalizedCode,
			);
			const factsInput: GovernanceFactsInput = {
				auditId,
				eventId,
				actorUserId: record.createdBy,
				meta,
				entityType: "governance_body",
				auditEntity: "governance_body",
				action: "CREATE",
			};
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
					return replayIdempotencyFingerprintMapped(
						existing[0],
						record.requestFingerprint,
						mapGovernanceBody,
					);
				}
				const [, rows] = await runNeonHttpTransaction<
					[unknown[], GovernanceBodyRow[]]
				>((sql) => [
					sql`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`,
					sql`
						WITH inserted AS (
							INSERT INTO ca_governance_body (
								id, organization_id, legal_company_id, code, normalized_code,
								body_type, display_name, status, version, create_idempotency_key,
								request_fingerprint, retired_at, retired_by, retirement_reason,
								created_by, updated_by
							)
							SELECT
								${id}::uuid, ${record.organizationId}::text, ${record.legalCompanyId}::uuid,
								${record.code}::text, ${record.normalizedCode}::text, ${record.bodyType}::text,
								${record.displayName}::text, ${record.status}::text, 1,
								${record.createIdempotencyKey}::text, ${record.requestFingerprint}::text,
								${record.retiredAt}::timestamptz, ${record.retiredBy}::text, ${record.retirementReason}::text,
								${record.createdBy}::text, ${record.updatedBy}::text
							WHERE NOT EXISTS (
								SELECT 1 FROM ca_governance_body existing
								WHERE existing.organization_id = ${record.organizationId}
									AND (
										existing.create_idempotency_key = ${record.createIdempotencyKey}
										OR (
											existing.legal_company_id = ${record.legalCompanyId}
											AND existing.normalized_code = ${record.normalizedCode}
										)
									)
							)
							RETURNING *
						),
						${governanceFactsCtes(sql, "inserted", factsInput)}
						SELECT inserted.* FROM inserted, audited, emitted
					`,
				]);
				const row = rows[0];
				if (!row) {
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
						return replayIdempotencyFingerprintMapped(
							byIdempotency[0],
							record.requestFingerprint,
							mapGovernanceBody,
						);
					}
					return fail(
						"CONFLICT",
						"Governance body code already exists",
						caErrorDetails(CA_ERROR_CODE_CONFLICT),
					);
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
						return replayIdempotencyFingerprintMapped(
							byIdempotency[0],
							record.requestFingerprint,
							mapGovernanceBody,
						);
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
					)
					.orderBy(
						asc(caGovernanceBody.normalizedCode),
						asc(caGovernanceBody.id),
					);
				return ok(rows.map(mapGovernanceBody));
			} catch (error) {
				return failFromUnknown(error, "Failed to list governance bodies");
			}
		},
		async updateGovernanceBody(record, expectedVersion, _ports, meta) {
			const lockKey = governanceBodyLockKey(
				record.organizationId,
				record.legalCompanyId,
				record.normalizedCode,
			);
			const factsInput: GovernanceFactsInput = {
				auditId: randomUUID(),
				eventId: randomUUID(),
				actorUserId: record.updatedBy,
				meta,
				entityType: "governance_body",
				auditEntity: "governance_body",
				action: "UPDATE",
			};
			try {
				const [, rows] = await runNeonHttpTransaction<
					[unknown[], GovernanceBodyRow[]]
				>((sql) => [
					sql`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`,
					sql`
						WITH updated AS (
							UPDATE ca_governance_body
							SET
								code = ${record.code}::text,
								normalized_code = ${record.normalizedCode}::text,
								body_type = ${record.bodyType}::text,
								display_name = ${record.displayName}::text,
								status = ${record.status}::text,
								retired_at = ${record.retiredAt}::timestamptz,
								retired_by = ${record.retiredBy}::text,
								retirement_reason = ${record.retirementReason}::text,
								updated_by = ${record.updatedBy}::text,
								version = ${expectedVersion + 1},
								updated_at = now()
							WHERE organization_id = ${record.organizationId}
								AND id = ${record.id}
								AND version = ${expectedVersion}
							RETURNING *
						),
						${governanceFactsCtes(sql, "updated", factsInput)}
						SELECT updated.* FROM updated, audited, emitted
					`,
				]);
				return rows[0] ? ok(mapGovernanceBody(rows[0])) : versionConflict();
			} catch (error) {
				if (isUniqueViolation(error)) {
					return fail(
						"CONFLICT",
						"Governance body code already exists",
						caErrorDetails(CA_ERROR_CODE_CONFLICT),
					);
				}
				return failFromUnknown(error, "Failed to update governance body");
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
		async createGovernanceMembership(record, _ports, meta) {
			const id = randomUUID();
			const factsInput: GovernanceFactsInput = {
				auditId: randomUUID(),
				eventId: randomUUID(),
				actorUserId: record.createdBy,
				meta,
				entityType: "governance_membership",
				auditEntity: "governance_membership",
				action: "CREATE",
			};
			const lockKey = governanceMembershipLockKey(
				record.organizationId,
				record.legalCompanyId,
				record.governanceBodyId,
			);
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
					return replayIdempotencyFingerprintMapped(
						existing[0],
						record.requestFingerprint,
						mapGovernanceMembership,
					);
				}
				const [, rows] = await runNeonHttpTransaction<
					[unknown[], GovernanceMembershipRow[]]
				>((sql) => [
					sql`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`,
					sql`
						WITH inserted AS (
							INSERT INTO ca_governance_membership (
								id, organization_id, legal_company_id, governance_body_id,
								member_party_id, member_party_code_snapshot, member_party_name_snapshot,
								officer_appointment_id, role_title, effective_from, effective_to,
								version, create_idempotency_key, request_fingerprint, end_reason,
								created_by, updated_by
							)
							SELECT
								${id}::uuid, ${record.organizationId}::text, ${record.legalCompanyId}::uuid,
								${record.governanceBodyId}::uuid, ${record.memberPartyId}::uuid,
								${record.memberPartyCodeSnapshot}::text, ${record.memberPartyNameSnapshot}::text,
								${record.officerAppointmentId}::uuid, ${record.roleTitle}::text,
								${record.effectiveFrom}::date, ${record.effectiveTo}::date, 1,
								${record.createIdempotencyKey}::text, ${record.requestFingerprint}::text,
								${record.endReason}::text, ${record.createdBy}::text, ${record.updatedBy}::text
							WHERE NOT EXISTS (
								SELECT 1 FROM ca_governance_membership existing
								WHERE existing.organization_id = ${record.organizationId}
									AND existing.create_idempotency_key = ${record.createIdempotencyKey}
							)
							RETURNING *
						),
						${governanceFactsCtes(sql, "inserted", factsInput)}
						SELECT inserted.* FROM inserted, audited, emitted
					`,
				]);
				const row = rows[0];
				if (!row) {
					const replay = await db
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
					if (replay[0]) {
						return replayIdempotencyFingerprintMapped(
							replay[0],
							record.requestFingerprint,
							mapGovernanceMembership,
						);
					}
					return fail(
						"INTERNAL_ERROR",
						"Failed to create governance membership",
					);
				}
				return ok(mapGovernanceMembership(row));
			} catch (error) {
				if (isUniqueViolation(error)) {
					const replayRows = await db
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
					if (replayRows[0]) {
						return replayIdempotencyFingerprintMapped(
							replayRows[0],
							record.requestFingerprint,
							mapGovernanceMembership,
						);
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
					)
					.orderBy(
						asc(caGovernanceMembership.effectiveFrom),
						asc(caGovernanceMembership.id),
					);
				return ok(rows.map(mapGovernanceMembership));
			} catch (error) {
				return failFromUnknown(error, "Failed to list governance memberships");
			}
		},
		async endGovernanceMembership(record, expectedVersion, _ports, meta) {
			const factsInput: GovernanceFactsInput = {
				auditId: randomUUID(),
				eventId: randomUUID(),
				actorUserId: record.updatedBy,
				meta,
				entityType: "governance_membership",
				auditEntity: "governance_membership",
				action: "UPDATE",
			};
			try {
				const [rows] = await runNeonHttpTransaction<
					[GovernanceMembershipRow[]]
				>((sql) => [
					sql`
							WITH updated AS (
								UPDATE ca_governance_membership
								SET
									effective_to = ${record.effectiveTo}::date,
									end_reason = ${record.endReason}::text,
									updated_by = ${record.updatedBy}::text,
									version = ${expectedVersion + 1},
									updated_at = now()
								WHERE organization_id = ${record.organizationId}
									AND id = ${record.id}
									AND version = ${expectedVersion}
								RETURNING *
							),
							${governanceFactsCtes(sql, "updated", factsInput)}
							SELECT updated.* FROM updated, audited, emitted
						`,
				]);
				return rows[0]
					? ok(mapGovernanceMembership(rows[0]))
					: versionConflict();
			} catch (error) {
				return failFromUnknown(error, "Failed to end governance membership");
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
		async createAuthorityMandate(record, holders, _ports, meta) {
			const mandateId = randomUUID();
			const lockKey = authorityMandateLockKey(
				record.organizationId,
				record.legalCompanyId,
				record.createIdempotencyKey,
			);
			const factsInput: GovernanceFactsInput = {
				auditId: randomUUID(),
				eventId: randomUUID(),
				actorUserId: record.createdBy,
				meta,
				entityType: "authority_mandate",
				auditEntity: "authority_mandate",
				action: "CREATE",
			};
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
					if (existing[0].requestFingerprint !== record.requestFingerprint) {
								return idempotencyFingerprintConflict();
					}
					const existingHolders = await db
						.select()
						.from(caAuthorityMandateHolder)
						.where(
							and(
								eq(
									caAuthorityMandateHolder.organizationId,
									record.organizationId,
								),
								eq(caAuthorityMandateHolder.authorityMandateId, existing[0].id),
							),
						)
						.orderBy(
							asc(caAuthorityMandateHolder.effectiveFrom),
							asc(caAuthorityMandateHolder.id),
						);
					return ok(mapAuthorityMandateDetail(existing[0], existingHolders));
				}
				const [, mandateRows] = await runNeonHttpTransaction<
					[unknown[], AuthorityMandateRow[], ...unknown[]]
				>((sql) => {
					const statements = [
						sql`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`,
						sql`
							WITH inserted AS (
								INSERT INTO ca_authority_mandate (
									id, organization_id, legal_company_id, mandate_type, scope_description,
									amount_limit, currency_code, signing_rule, minimum_signatories,
									effective_from, effective_to, grant_evidence_reference,
									revocation_evidence_reference, status, version, create_idempotency_key,
									request_fingerprint, supersedes_authority_mandate_id, amendment_reason,
									revocation_reason, created_by, updated_by
								)
								SELECT
									${mandateId}::uuid, ${record.organizationId}::text, ${record.legalCompanyId}::uuid,
									${record.mandateType}::text, ${record.scopeDescription}::text,
									${record.amountLimit}::numeric, ${record.currencyCode}::text,
									${record.signingRule}::text, ${record.minimumSignatories}::integer,
									${record.effectiveFrom}::date, ${record.effectiveTo}::date,
									${record.grantEvidenceReference}::text, ${record.revocationEvidenceReference}::text,
									${record.status}::text, 1, ${record.createIdempotencyKey}::text,
									${record.requestFingerprint}::text, ${record.supersedesAuthorityMandateId}::uuid,
									${record.amendmentReason}::text, ${record.revocationReason}::text,
									${record.createdBy}::text, ${record.updatedBy}::text
								WHERE NOT EXISTS (
									SELECT 1 FROM ca_authority_mandate existing
									WHERE existing.organization_id = ${record.organizationId}
										AND existing.create_idempotency_key = ${record.createIdempotencyKey}
								)
								RETURNING *
							),
							${governanceFactsCtes(sql, "inserted", factsInput)}
							SELECT inserted.* FROM inserted, audited, emitted
						`,
					];
					for (const holder of holders) {
						statements.push(sql`
							INSERT INTO ca_authority_mandate_holder (
								id, organization_id, legal_company_id, authority_mandate_id,
								holder_kind, party_id, party_code_snapshot, party_name_snapshot,
								officer_appointment_id, effective_from, effective_to, created_by
							) VALUES (
								${randomUUID()}::uuid, ${holder.organizationId}::text, ${holder.legalCompanyId}::uuid,
								${mandateId}::uuid, ${holder.holderKind}::text, ${holder.partyId}::uuid,
								${holder.partyCodeSnapshot}::text, ${holder.partyNameSnapshot}::text,
								${holder.officerAppointmentId}::uuid, ${holder.effectiveFrom}::date,
								${holder.effectiveTo}::date, ${holder.createdBy}::text
							)
						`);
					}
					return statements;
				});
				const mandateRow = mandateRows[0];
				if (!mandateRow) {
					const replay = await db
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
					if (replay[0]) {
						if (replay[0].requestFingerprint !== record.requestFingerprint) {
							return idempotencyFingerprintConflict();
						}
						const holderRows = await db
							.select()
							.from(caAuthorityMandateHolder)
							.where(
								and(
									eq(
										caAuthorityMandateHolder.organizationId,
										record.organizationId,
									),
									eq(caAuthorityMandateHolder.authorityMandateId, replay[0].id),
								),
							)
							.orderBy(
								asc(caAuthorityMandateHolder.effectiveFrom),
								asc(caAuthorityMandateHolder.id),
							);
						return ok(mapAuthorityMandateDetail(replay[0], holderRows));
					}
					return fail("INTERNAL_ERROR", "Failed to create authority mandate");
				}
				const holderRows =
					holders.length === 0
						? []
						: await db
								.select()
								.from(caAuthorityMandateHolder)
								.where(
									and(
										eq(
											caAuthorityMandateHolder.organizationId,
											record.organizationId,
										),
										eq(
											caAuthorityMandateHolder.authorityMandateId,
											mandateRow.id,
										),
									),
								)
								.orderBy(
									asc(caAuthorityMandateHolder.effectiveFrom),
									asc(caAuthorityMandateHolder.id),
								);
				return ok(mapAuthorityMandateDetail(mandateRow, holderRows));
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
						if (rows[0].requestFingerprint !== record.requestFingerprint) {
							return idempotencyFingerprintConflict();
						}
						const holderRows = await db
							.select()
							.from(caAuthorityMandateHolder)
							.where(
								and(
									eq(
										caAuthorityMandateHolder.organizationId,
										record.organizationId,
									),
									eq(caAuthorityMandateHolder.authorityMandateId, rows[0].id),
								),
							)
							.orderBy(
								asc(caAuthorityMandateHolder.effectiveFrom),
								asc(caAuthorityMandateHolder.id),
							);
						return ok(mapAuthorityMandateDetail(rows[0], holderRows));
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
				if (!rows[0]) return ok(null);
				const holderRows = await db
					.select()
					.from(caAuthorityMandateHolder)
					.where(
						and(
							eq(caAuthorityMandateHolder.organizationId, organizationId),
							eq(
								caAuthorityMandateHolder.authorityMandateId,
								authorityMandateId,
							),
						),
					)
					.orderBy(
						asc(caAuthorityMandateHolder.effectiveFrom),
						asc(caAuthorityMandateHolder.id),
					);
				return ok(mapAuthorityMandateDetail(rows[0], holderRows));
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
					)
					.orderBy(
						asc(caAuthorityMandate.effectiveFrom),
						asc(caAuthorityMandate.id),
					);
				const holderRows = await db
					.select()
					.from(caAuthorityMandateHolder)
					.where(
						and(
							eq(caAuthorityMandateHolder.organizationId, organizationId),
							eq(caAuthorityMandateHolder.legalCompanyId, legalCompanyId),
						),
					)
					.orderBy(
						asc(caAuthorityMandateHolder.effectiveFrom),
						asc(caAuthorityMandateHolder.id),
					);
				const holdersByMandate = new Map<string, AuthorityMandateHolderRow[]>();
				for (const holder of holderRows) {
					const current = holdersByMandate.get(holder.authorityMandateId) ?? [];
					current.push(holder);
					holdersByMandate.set(holder.authorityMandateId, current);
				}
				return ok(
					rows.map((row) =>
						mapAuthorityMandateDetail(row, holdersByMandate.get(row.id) ?? []),
					),
				);
			} catch (error) {
				return failFromUnknown(error, "Failed to list authority mandates");
			}
		},
		async supersedeAuthorityMandate(
			current,
			replacement,
			holders,
			expectedVersion,
			_ports,
			meta,
		) {
			const mandateId = randomUUID();
			const lockKey = authorityMandateLockKey(
				replacement.organizationId,
				replacement.legalCompanyId,
				replacement.createIdempotencyKey,
			);
			const updateFacts: GovernanceFactsInput = {
				auditId: randomUUID(),
				eventId: randomUUID(),
				actorUserId: current.updatedBy,
				meta,
				entityType: "authority_mandate",
				auditEntity: "authority_mandate",
				action: "UPDATE",
			};
			const createFacts: GovernanceFactsInput = {
				auditId: randomUUID(),
				eventId: randomUUID(),
				actorUserId: replacement.createdBy,
				meta,
				entityType: "authority_mandate",
				auditEntity: "authority_mandate",
				action: "CREATE",
			};
			try {
				const [, mandateRows] = await runNeonHttpTransaction<
					[unknown[], AuthorityMandateRow[], ...unknown[]]
				>((sql) => {
					const statements = [
						sql`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`,
						sql`
							WITH updated_current AS (
								UPDATE ca_authority_mandate
								SET
									effective_to = ${current.effectiveTo}::date,
									status = ${current.status}::text,
									updated_by = ${current.updatedBy}::text,
									version = ${expectedVersion + 1},
									updated_at = now()
								WHERE organization_id = ${current.organizationId}
									AND id = ${current.id}
									AND version = ${expectedVersion}
								RETURNING *
							),
							audited_current AS (
								INSERT INTO platform_audit_log (
									id, organization_id, actor_user_id, correlation_id, module,
									entity, entity_id, action, changes
								)
								SELECT
									${updateFacts.auditId}::uuid, organization_id, ${updateFacts.actorUserId}::text,
									${updateFacts.meta.correlationId}::text, 'corporate-administration',
									${updateFacts.auditEntity}::text, id::text, ${updateFacts.action}::text, '[]'::jsonb
								FROM updated_current
								RETURNING id
							),
							emitted_current AS (
								INSERT INTO platform_domain_event (
									id, organization_id, type, source_module, correlation_id,
									actor_user_id, payload, status, attempts
								)
								SELECT
									${updateFacts.eventId}::uuid, organization_id, ${updateFacts.meta.eventType}::text,
									'corporate-administration', ${updateFacts.meta.correlationId}::text,
									${updateFacts.actorUserId}::text,
									jsonb_build_object(
										'organizationId', organization_id,
										'legalCompanyId', legal_company_id,
										'entityType', ${updateFacts.entityType}::text,
										'entityId', id,
										'version', version,
										'actorId', ${updateFacts.actorUserId}::text,
										'correlationId', ${updateFacts.meta.correlationId}::text,
										'status', status
									), 'pending', 0
								FROM updated_current
								RETURNING id
							),
							inserted_successor AS (
								INSERT INTO ca_authority_mandate (
									id, organization_id, legal_company_id, mandate_type, scope_description,
									amount_limit, currency_code, signing_rule, minimum_signatories,
									effective_from, effective_to, grant_evidence_reference,
									revocation_evidence_reference, status, version, create_idempotency_key,
									request_fingerprint, supersedes_authority_mandate_id, amendment_reason,
									revocation_reason, created_by, updated_by
								)
								SELECT
									${mandateId}::uuid, ${replacement.organizationId}::text, ${replacement.legalCompanyId}::uuid,
									${replacement.mandateType}::text, ${replacement.scopeDescription}::text,
									${replacement.amountLimit}::numeric, ${replacement.currencyCode}::text,
									${replacement.signingRule}::text, ${replacement.minimumSignatories}::integer,
									${replacement.effectiveFrom}::date, ${replacement.effectiveTo}::date,
									${replacement.grantEvidenceReference}::text, ${replacement.revocationEvidenceReference}::text,
									${replacement.status}::text, 1, ${replacement.createIdempotencyKey}::text,
									${replacement.requestFingerprint}::text, ${replacement.supersedesAuthorityMandateId}::uuid,
									${replacement.amendmentReason}::text, ${replacement.revocationReason}::text,
									${replacement.createdBy}::text, ${replacement.updatedBy}::text
								FROM updated_current
								RETURNING *
							),
							${governanceFactsCtes(sql, "inserted_successor", createFacts)}
							SELECT inserted_successor.* FROM inserted_successor, updated_current, audited_current, emitted_current, audited, emitted
						`,
					];
					for (const holder of holders) {
						statements.push(sql`
							INSERT INTO ca_authority_mandate_holder (
								id, organization_id, legal_company_id, authority_mandate_id,
								holder_kind, party_id, party_code_snapshot, party_name_snapshot,
								officer_appointment_id, effective_from, effective_to, created_by
							) VALUES (
								${randomUUID()}::uuid, ${holder.organizationId}::text, ${holder.legalCompanyId}::uuid,
								${mandateId}::uuid, ${holder.holderKind}::text, ${holder.partyId}::uuid,
								${holder.partyCodeSnapshot}::text, ${holder.partyNameSnapshot}::text,
								${holder.officerAppointmentId}::uuid, ${holder.effectiveFrom}::date,
								${holder.effectiveTo}::date, ${holder.createdBy}::text
							)
						`);
					}
					return statements;
				});
				const mandateRow = mandateRows[0];
				if (!mandateRow) return versionConflict();
				const holderRows =
					holders.length === 0
						? []
						: await db
								.select()
								.from(caAuthorityMandateHolder)
								.where(
									and(
										eq(
											caAuthorityMandateHolder.organizationId,
											mandateRow.organizationId,
										),
										eq(
											caAuthorityMandateHolder.authorityMandateId,
											mandateRow.id,
										),
									),
								)
								.orderBy(
									asc(caAuthorityMandateHolder.effectiveFrom),
									asc(caAuthorityMandateHolder.id),
								);
				return ok(mapAuthorityMandateDetail(mandateRow, holderRows));
			} catch (error) {
				return failFromUnknown(error, "Failed to supersede authority mandate");
			}
		},
		async revokeAuthorityMandate(record, expectedVersion, _ports, meta) {
			const factsInput: GovernanceFactsInput = {
				auditId: randomUUID(),
				eventId: randomUUID(),
				actorUserId: record.updatedBy,
				meta,
				entityType: "authority_mandate",
				auditEntity: "authority_mandate",
				action: "UPDATE",
			};
			try {
				const [rows] = await runNeonHttpTransaction<[AuthorityMandateRow[]]>(
					(sql) => [
						sql`
							WITH updated AS (
								UPDATE ca_authority_mandate
								SET
									effective_to = ${record.effectiveTo}::date,
									revocation_evidence_reference = ${record.revocationEvidenceReference}::text,
									status = ${record.status}::text,
									revocation_reason = ${record.revocationReason}::text,
									updated_by = ${record.updatedBy}::text,
									version = ${expectedVersion + 1},
									updated_at = now()
								WHERE organization_id = ${record.organizationId}
									AND id = ${record.id}
									AND version = ${expectedVersion}
								RETURNING *
							),
							${governanceFactsCtes(sql, "updated", factsInput)}
							SELECT updated.* FROM updated, audited, emitted
						`,
					],
				);
				if (!rows[0]) return versionConflict();
				return ok(
					mapAuthorityMandateDetail(
						rows[0],
						record.holders.map((holder) => ({
							...holder,
						})),
					),
				);
			} catch (error) {
				return failFromUnknown(error, "Failed to revoke authority mandate");
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
		async createCompanyPremise(record, _ports, meta) {
			const id = randomUUID();
			const factsInput: GovernanceFactsInput = {
				auditId: randomUUID(),
				eventId: randomUUID(),
				actorUserId: record.createdBy,
				meta,
				entityType: "company_premise",
				auditEntity: "company_premise",
				action: "CREATE",
			};
			const primaryLockKey = record.isPrimary
				? companyPremisePrimaryLockKey(
						record.organizationId,
						record.legalCompanyId,
					)
				: null;
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
					return replayIdempotencyFingerprintMapped(
						existing[0],
						record.requestFingerprint,
						mapCompanyPremise,
					);
				}
				let row: CompanyPremiseRow | undefined;
				if (primaryLockKey) {
					const [, rows] = await runNeonHttpTransaction<
						[unknown[], CompanyPremiseRow[]]
					>((sql) => [
						sql`SELECT pg_advisory_xact_lock(hashtextextended(${primaryLockKey}, 0))`,
						sql`
							WITH inserted AS (
								INSERT INTO ca_company_premise (
									id, organization_id, legal_company_id, premise_type, party_address_id,
									address_line1_snapshot, address_line2_snapshot, city_snapshot, region_snapshot,
									postal_code_snapshot, country_code_snapshot, is_primary, effective_from,
									effective_to, status, version, create_idempotency_key, request_fingerprint,
									supersedes_company_premise_id, amendment_reason, retirement_reason,
									created_by, updated_by
								)
								SELECT
									${id}::uuid, ${record.organizationId}::text, ${record.legalCompanyId}::uuid,
									${record.premiseType}::text, ${record.partyAddressId}::uuid,
									${record.addressLine1Snapshot}::text, ${record.addressLine2Snapshot}::text,
									${record.citySnapshot}::text, ${record.regionSnapshot}::text,
									${record.postalCodeSnapshot}::text, ${record.countryCodeSnapshot}::text,
									${record.isPrimary}::boolean, ${record.effectiveFrom}::date, ${record.effectiveTo}::date,
									${record.status}::text, 1, ${record.createIdempotencyKey}::text,
									${record.requestFingerprint}::text, ${record.supersedesCompanyPremiseId}::uuid,
									${record.amendmentReason}::text, ${record.retirementReason}::text,
									${record.createdBy}::text, ${record.updatedBy}::text
								WHERE NOT EXISTS (
									SELECT 1 FROM ca_company_premise existing
									WHERE existing.organization_id = ${record.organizationId}
										AND existing.create_idempotency_key = ${record.createIdempotencyKey}
								)
								RETURNING *
							),
							${governanceFactsCtes(sql, "inserted", factsInput)}
							SELECT inserted.* FROM inserted, audited, emitted
						`,
					]);
					row = rows[0];
				} else {
					const [rows] = await runNeonHttpTransaction<[CompanyPremiseRow[]]>(
						(sql) => [
							sql`
								WITH inserted AS (
									INSERT INTO ca_company_premise (
										id, organization_id, legal_company_id, premise_type, party_address_id,
										address_line1_snapshot, address_line2_snapshot, city_snapshot, region_snapshot,
										postal_code_snapshot, country_code_snapshot, is_primary, effective_from,
										effective_to, status, version, create_idempotency_key, request_fingerprint,
										supersedes_company_premise_id, amendment_reason, retirement_reason,
										created_by, updated_by
									)
									SELECT
										${id}::uuid, ${record.organizationId}::text, ${record.legalCompanyId}::uuid,
										${record.premiseType}::text, ${record.partyAddressId}::uuid,
										${record.addressLine1Snapshot}::text, ${record.addressLine2Snapshot}::text,
										${record.citySnapshot}::text, ${record.regionSnapshot}::text,
										${record.postalCodeSnapshot}::text, ${record.countryCodeSnapshot}::text,
										${record.isPrimary}::boolean, ${record.effectiveFrom}::date, ${record.effectiveTo}::date,
										${record.status}::text, 1, ${record.createIdempotencyKey}::text,
										${record.requestFingerprint}::text, ${record.supersedesCompanyPremiseId}::uuid,
										${record.amendmentReason}::text, ${record.retirementReason}::text,
										${record.createdBy}::text, ${record.updatedBy}::text
									WHERE NOT EXISTS (
										SELECT 1 FROM ca_company_premise existing
										WHERE existing.organization_id = ${record.organizationId}
											AND existing.create_idempotency_key = ${record.createIdempotencyKey}
									)
									RETURNING *
								),
								${governanceFactsCtes(sql, "inserted", factsInput)}
								SELECT inserted.* FROM inserted, audited, emitted
							`,
						],
					);
					row = rows[0];
				}
				if (!row) {
					const replay = await db
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
					if (replay[0]) {
						return replayIdempotencyFingerprintMapped(
							replay[0],
							record.requestFingerprint,
							mapCompanyPremise,
						);
					}
					return fail("INTERNAL_ERROR", "Failed to create company premise");
				}
				return ok(mapCompanyPremise(row));
			} catch (error) {
				if (isUniqueViolation(error)) {
					const replayRows = await db
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
					if (replayRows[0]) {
						return replayIdempotencyFingerprintMapped(
							replayRows[0],
							record.requestFingerprint,
							mapCompanyPremise,
						);
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
					)
					.orderBy(
						asc(caCompanyPremise.effectiveFrom),
						asc(caCompanyPremise.id),
					);
				return ok(rows.map(mapCompanyPremise));
			} catch (error) {
				return failFromUnknown(error, "Failed to list company premises");
			}
		},
		async supersedeCompanyPremise(
			current,
			replacement,
			expectedVersion,
			_ports,
			meta,
		) {
			const successorId = randomUUID();
			const primaryLockKey =
				replacement.isPrimary || current.isPrimary
					? companyPremisePrimaryLockKey(
							replacement.organizationId,
							replacement.legalCompanyId,
						)
					: null;
			const updateFacts: GovernanceFactsInput = {
				auditId: randomUUID(),
				eventId: randomUUID(),
				actorUserId: current.updatedBy,
				meta,
				entityType: "company_premise",
				auditEntity: "company_premise",
				action: "UPDATE",
			};
			const createFacts: GovernanceFactsInput = {
				auditId: randomUUID(),
				eventId: randomUUID(),
				actorUserId: replacement.createdBy,
				meta,
				entityType: "company_premise",
				auditEntity: "company_premise",
				action: "CREATE",
			};
			const supersedeSql = (sql: NeonHttpSql) => sql`
				WITH updated_current AS (
					UPDATE ca_company_premise
					SET
						effective_to = ${current.effectiveTo}::date,
						status = ${current.status}::text,
						amendment_reason = ${current.amendmentReason}::text,
						retirement_reason = ${current.retirementReason}::text,
						updated_by = ${current.updatedBy}::text,
						version = ${expectedVersion + 1},
						updated_at = now()
					WHERE organization_id = ${current.organizationId}
						AND id = ${current.id}
						AND version = ${expectedVersion}
					RETURNING *
				),
				audited_current AS (
					INSERT INTO platform_audit_log (
						id, organization_id, actor_user_id, correlation_id, module,
						entity, entity_id, action, changes
					)
					SELECT
						${updateFacts.auditId}::uuid, organization_id, ${updateFacts.actorUserId}::text,
						${updateFacts.meta.correlationId}::text, 'corporate-administration',
						${updateFacts.auditEntity}::text, id::text, ${updateFacts.action}::text, '[]'::jsonb
					FROM updated_current
					RETURNING id
				),
				emitted_current AS (
					INSERT INTO platform_domain_event (
						id, organization_id, type, source_module, correlation_id,
						actor_user_id, payload, status, attempts
					)
					SELECT
						${updateFacts.eventId}::uuid, organization_id, ${updateFacts.meta.eventType}::text,
						'corporate-administration', ${updateFacts.meta.correlationId}::text,
						${updateFacts.actorUserId}::text,
						jsonb_build_object(
							'organizationId', organization_id,
							'legalCompanyId', legal_company_id,
							'entityType', ${updateFacts.entityType}::text,
							'entityId', id,
							'version', version,
							'actorId', ${updateFacts.actorUserId}::text,
							'correlationId', ${updateFacts.meta.correlationId}::text,
							'status', status
						), 'pending', 0
					FROM updated_current
					RETURNING id
				),
				inserted_successor AS (
					INSERT INTO ca_company_premise (
						id, organization_id, legal_company_id, premise_type, party_address_id,
						address_line1_snapshot, address_line2_snapshot, city_snapshot, region_snapshot,
						postal_code_snapshot, country_code_snapshot, is_primary, effective_from,
						effective_to, status, version, create_idempotency_key, request_fingerprint,
						supersedes_company_premise_id, amendment_reason, retirement_reason,
						created_by, updated_by
					)
					SELECT
						${successorId}::uuid, ${replacement.organizationId}::text, ${replacement.legalCompanyId}::uuid,
						${replacement.premiseType}::text, ${replacement.partyAddressId}::uuid,
						${replacement.addressLine1Snapshot}::text, ${replacement.addressLine2Snapshot}::text,
						${replacement.citySnapshot}::text, ${replacement.regionSnapshot}::text,
						${replacement.postalCodeSnapshot}::text, ${replacement.countryCodeSnapshot}::text,
						${replacement.isPrimary}::boolean, ${replacement.effectiveFrom}::date, ${replacement.effectiveTo}::date,
						${replacement.status}::text, 1, ${replacement.createIdempotencyKey}::text,
						${replacement.requestFingerprint}::text, ${replacement.supersedesCompanyPremiseId}::uuid,
						${replacement.amendmentReason}::text, ${replacement.retirementReason}::text,
						${replacement.createdBy}::text, ${replacement.updatedBy}::text
					FROM updated_current
					RETURNING *
				),
				${governanceFactsCtes(sql, "inserted_successor", createFacts)}
				SELECT inserted_successor.* FROM inserted_successor, updated_current, audited_current, emitted_current, audited, emitted
			`;
			try {
				let row: CompanyPremiseRow | undefined;
				if (primaryLockKey) {
					const [, rows] = await runNeonHttpTransaction<
						[unknown[], CompanyPremiseRow[]]
					>((sql) => [
						sql`SELECT pg_advisory_xact_lock(hashtextextended(${primaryLockKey}, 0))`,
						supersedeSql(sql),
					]);
					row = rows[0];
				} else {
					const [rows] = await runNeonHttpTransaction<[CompanyPremiseRow[]]>(
						(sql) => [supersedeSql(sql)],
					);
					row = rows[0];
				}
				if (!row) return versionConflict();
				return ok(mapCompanyPremise(row));
			} catch (error) {
				return failFromUnknown(error, "Failed to supersede company premise");
			}
		},
		async retireCompanyPremise(record, expectedVersion, _ports, meta) {
			const factsInput: GovernanceFactsInput = {
				auditId: randomUUID(),
				eventId: randomUUID(),
				actorUserId: record.updatedBy,
				meta,
				entityType: "company_premise",
				auditEntity: "company_premise",
				action: "UPDATE",
			};
			try {
				const [rows] = await runNeonHttpTransaction<[CompanyPremiseRow[]]>(
					(sql) => [
						sql`
							WITH updated AS (
								UPDATE ca_company_premise
								SET
									effective_to = ${record.effectiveTo}::date,
									status = ${record.status}::text,
									retirement_reason = ${record.retirementReason}::text,
									updated_by = ${record.updatedBy}::text,
									version = ${expectedVersion + 1},
									updated_at = now()
								WHERE organization_id = ${record.organizationId}
									AND id = ${record.id}
									AND version = ${expectedVersion}
								RETURNING *
							),
							${governanceFactsCtes(sql, "updated", factsInput)}
							SELECT updated.* FROM updated, audited, emitted
						`,
					],
				);
				return rows[0] ? ok(mapCompanyPremise(rows[0])) : versionConflict();
			} catch (error) {
				return failFromUnknown(error, "Failed to retire company premise");
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
		async createGovernanceMeeting(record, _ports, meta) {
			const id = randomUUID();
			const factsInput: GovernanceFactsInput = {
				auditId: randomUUID(),
				eventId: randomUUID(),
				actorUserId: record.createdBy,
				meta,
				entityType: "governance_meeting",
				auditEntity: "governance_meeting",
				action: "CREATE",
			};
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
					return replayIdempotencyFingerprintMapped(
						existing[0],
						record.requestFingerprint,
						mapGovernanceMeeting,
					);
				}
				const [rows] = await runNeonHttpTransaction<[GovernanceMeetingRow[]]>(
					(sql) => [
						sql`
							WITH inserted AS (
								INSERT INTO ca_governance_meeting (
									id, organization_id, legal_company_id, governance_body_id, meeting_at,
									quorum_result, status, minutes_document_reference, version,
									create_idempotency_key, request_fingerprint, corrects_governance_meeting_id,
									correction_reason, closed_at, closed_by, created_by, updated_by
								)
								SELECT
									${id}::uuid, ${record.organizationId}::text, ${record.legalCompanyId}::uuid,
									${record.governanceBodyId}::uuid, ${record.meetingAt}::timestamptz,
									${record.quorumResult}::text, ${record.status}::text,
									${record.minutesDocumentReference}::text, 1,
									${record.createIdempotencyKey}::text, ${record.requestFingerprint}::text,
									${record.correctsGovernanceMeetingId}::uuid, ${record.correctionReason}::text,
									${record.closedAt}::timestamptz, ${record.closedBy}::text,
									${record.createdBy}::text, ${record.updatedBy}::text
								WHERE NOT EXISTS (
									SELECT 1 FROM ca_governance_meeting existing
									WHERE existing.organization_id = ${record.organizationId}
										AND existing.create_idempotency_key = ${record.createIdempotencyKey}
								)
								RETURNING *
							),
							${governanceFactsCtes(sql, "inserted", factsInput)}
							SELECT inserted.* FROM inserted, audited, emitted
						`,
					],
				);
				const row = rows[0];
				if (!row) {
					const replay = await db
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
					if (replay[0]) {
						return replayIdempotencyFingerprintMapped(
							replay[0],
							record.requestFingerprint,
							mapGovernanceMeeting,
						);
					}
					return fail("INTERNAL_ERROR", "Failed to create governance meeting");
				}
				return ok(mapGovernanceMeeting(row));
			} catch (error) {
				if (isUniqueViolation(error)) {
					const replayRows = await db
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
					if (replayRows[0]) {
						return replayIdempotencyFingerprintMapped(
							replayRows[0],
							record.requestFingerprint,
							mapGovernanceMeeting,
						);
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
					)
					.orderBy(
						asc(caGovernanceMeeting.meetingAt),
						asc(caGovernanceMeeting.id),
					);
				return ok(rows.map(mapGovernanceMeeting));
			} catch (error) {
				return failFromUnknown(error, "Failed to list governance meetings");
			}
		},
		async closeGovernanceMeeting(record, expectedVersion, _ports, meta) {
			const factsInput: GovernanceFactsInput = {
				auditId: randomUUID(),
				eventId: randomUUID(),
				actorUserId: record.updatedBy,
				meta,
				entityType: "governance_meeting",
				auditEntity: "governance_meeting",
				action: "UPDATE",
			};
			try {
				const [rows] = await runNeonHttpTransaction<[GovernanceMeetingRow[]]>(
					(sql) => [
						sql`
							WITH updated AS (
								UPDATE ca_governance_meeting
								SET
									quorum_result = ${record.quorumResult}::text,
									status = ${record.status}::text,
									minutes_document_reference = ${record.minutesDocumentReference}::text,
									closed_at = ${record.closedAt}::timestamptz,
									closed_by = ${record.closedBy}::text,
									updated_by = ${record.updatedBy}::text,
									version = ${expectedVersion + 1},
									updated_at = now()
								WHERE organization_id = ${record.organizationId}
									AND id = ${record.id}
									AND version = ${expectedVersion}
								RETURNING *
							),
							${governanceFactsCtes(sql, "updated", factsInput)}
							SELECT updated.* FROM updated, audited, emitted
						`,
					],
				);
				return rows[0] ? ok(mapGovernanceMeeting(rows[0])) : versionConflict();
			} catch (error) {
				return failFromUnknown(error, "Failed to close governance meeting");
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
		async createResolution(record, _ports, meta) {
			const id = randomUUID();
			const lockKey = resolutionLockKey(
				record.organizationId,
				record.legalCompanyId,
				record.resolutionYear,
				record.resolutionNumber,
			);
			const factsInput: GovernanceFactsInput = {
				auditId: randomUUID(),
				eventId: randomUUID(),
				actorUserId: record.createdBy,
				meta,
				entityType: "resolution",
				auditEntity: "resolution",
				action: "CREATE",
			};
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
					return replayIdempotencyFingerprintMapped(
						existing[0],
						record.requestFingerprint,
						mapResolution,
					);
				}
				const [, rows] = await runNeonHttpTransaction<
					[unknown[], ResolutionRow[]]
				>((sql) => [
					sql`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`,
					sql`
							WITH inserted AS (
								INSERT INTO ca_resolution (
									id, organization_id, legal_company_id, governance_meeting_id,
									resolution_number, resolution_year, title, description, status,
									approved_date, approval_evidence_reference, supersedes_resolution_id,
									superseded_by_id, superseded_at, revoked_date, revocation_reason,
									revocation_evidence_reference, version, create_idempotency_key,
									request_fingerprint, created_by, updated_by
								)
								SELECT
									${id}::uuid, ${record.organizationId}::text, ${record.legalCompanyId}::uuid,
									${record.governanceMeetingId}::uuid, ${record.resolutionNumber}::text,
									${record.resolutionYear}::integer, ${record.title}::text, ${record.description}::text,
									${record.status}::text, ${record.approvedDate}::date,
									${record.approvalEvidenceReference}::text, ${record.supersedesResolutionId}::uuid,
									${record.supersededById}::uuid, ${record.supersededAt}::timestamptz,
									${record.revokedDate}::date, ${record.revocationReason}::text,
									${record.revocationEvidenceReference}::text, 1,
									${record.createIdempotencyKey}::text, ${record.requestFingerprint}::text,
									${record.createdBy}::text, ${record.updatedBy}::text
								WHERE NOT EXISTS (
									SELECT 1 FROM ca_resolution existing
									WHERE existing.organization_id = ${record.organizationId}
										AND (
											existing.create_idempotency_key = ${record.createIdempotencyKey}
											OR (
												existing.legal_company_id = ${record.legalCompanyId}
												AND existing.resolution_year = ${record.resolutionYear}
												AND existing.resolution_number = ${record.resolutionNumber}
											)
										)
								)
								RETURNING *
							),
							${governanceFactsCtes(sql, "inserted", factsInput)}
							SELECT inserted.* FROM inserted, audited, emitted
						`,
				]);
				const row = rows[0];
				if (!row) {
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
						return replayIdempotencyFingerprintMapped(
							byIdempotency[0],
							record.requestFingerprint,
							mapResolution,
						);
					}
					return fail(
						"CONFLICT",
						"Resolution number already exists for year",
						caErrorDetails(CA_ERROR_CODE_CONFLICT),
					);
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
						return replayIdempotencyFingerprintMapped(
							byIdempotency[0],
							record.requestFingerprint,
							mapResolution,
						);
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
					)
					.orderBy(
						desc(caResolution.resolutionYear),
						asc(caResolution.resolutionNumber),
						asc(caResolution.id),
					);
				return ok(rows.map(mapResolution));
			} catch (error) {
				return failFromUnknown(error, "Failed to list resolutions");
			}
		},
		async approveResolution(
			record,
			expectedVersion,
			_ports,
			meta,
			predecessor,
			predecessorMeta,
		) {
			const approveFacts: GovernanceFactsInput = {
				auditId: randomUUID(),
				eventId: randomUUID(),
				actorUserId: record.updatedBy,
				meta,
				entityType: "resolution",
				auditEntity: "resolution",
				action: "UPDATE",
			};
			const predecessorFacts: GovernanceFactsInput | null = predecessor
				? {
						auditId: randomUUID(),
						eventId: randomUUID(),
						actorUserId: predecessor.updatedBy,
						meta: predecessorMeta ?? meta,
						entityType: "resolution",
						auditEntity: "resolution",
						action: "UPDATE",
					}
				: null;
			try {
				const [rows] = await runNeonHttpTransaction<[ResolutionRow[]]>(
					(sql) => [
						predecessor && predecessorFacts
							? sql`
								WITH updated_predecessor AS (
									UPDATE ca_resolution
									SET
										status = ${predecessor.status}::text,
										superseded_by_id = ${predecessor.supersededById}::uuid,
										superseded_at = ${predecessor.supersededAt}::timestamptz,
										updated_by = ${predecessor.updatedBy}::text,
										version = ${predecessor.version + 1},
										updated_at = now()
									WHERE organization_id = ${predecessor.organizationId}
										AND id = ${predecessor.id}
										AND version = ${predecessor.version}
									RETURNING *
								),
								audited_predecessor AS (
									INSERT INTO platform_audit_log (
										id, organization_id, actor_user_id, correlation_id, module,
										entity, entity_id, action, changes
									)
									SELECT
										${predecessorFacts.auditId}::uuid, organization_id, ${predecessorFacts.actorUserId}::text,
										${predecessorFacts.meta.correlationId}::text, 'corporate-administration',
										${predecessorFacts.auditEntity}::text, id::text, ${predecessorFacts.action}::text, '[]'::jsonb
									FROM updated_predecessor
									RETURNING id
								),
								emitted_predecessor AS (
									INSERT INTO platform_domain_event (
										id, organization_id, type, source_module, correlation_id,
										actor_user_id, payload, status, attempts
									)
									SELECT
										${predecessorFacts.eventId}::uuid, organization_id, ${predecessorFacts.meta.eventType}::text,
										'corporate-administration', ${predecessorFacts.meta.correlationId}::text,
										${predecessorFacts.actorUserId}::text,
										jsonb_build_object(
											'organizationId', organization_id,
											'legalCompanyId', legal_company_id,
											'entityType', ${predecessorFacts.entityType}::text,
											'entityId', id,
											'version', version,
											'actorId', ${predecessorFacts.actorUserId}::text,
											'correlationId', ${predecessorFacts.meta.correlationId}::text,
											'status', status
										), 'pending', 0
									FROM updated_predecessor
									RETURNING id
								),
								updated AS (
									UPDATE ca_resolution
									SET
										status = ${record.status}::text,
										approved_date = ${record.approvedDate}::date,
										approval_evidence_reference = ${record.approvalEvidenceReference}::text,
										supersedes_resolution_id = ${record.supersedesResolutionId}::uuid,
										updated_by = ${record.updatedBy}::text,
										version = ${expectedVersion + 1},
										updated_at = now()
									WHERE organization_id = ${record.organizationId}
										AND id = ${record.id}
										AND version = ${expectedVersion}
									RETURNING *
								),
								${governanceFactsCtes(sql, "updated", approveFacts)}
								SELECT updated.* FROM updated, updated_predecessor, audited_predecessor, emitted_predecessor, audited, emitted
							`
							: sql`
								WITH updated AS (
									UPDATE ca_resolution
									SET
										status = ${record.status}::text,
										approved_date = ${record.approvedDate}::date,
										approval_evidence_reference = ${record.approvalEvidenceReference}::text,
										supersedes_resolution_id = ${record.supersedesResolutionId}::uuid,
										updated_by = ${record.updatedBy}::text,
										version = ${expectedVersion + 1},
										updated_at = now()
									WHERE organization_id = ${record.organizationId}
										AND id = ${record.id}
										AND version = ${expectedVersion}
									RETURNING *
								),
								${governanceFactsCtes(sql, "updated", approveFacts)}
								SELECT updated.* FROM updated, audited, emitted
							`,
					],
				);
				return rows[0] ? ok(mapResolution(rows[0])) : versionConflict();
			} catch (error) {
				return failFromUnknown(error, "Failed to approve resolution");
			}
		},
		async revokeResolution(record, expectedVersion, _ports, meta) {
			const factsInput: GovernanceFactsInput = {
				auditId: randomUUID(),
				eventId: randomUUID(),
				actorUserId: record.updatedBy,
				meta,
				entityType: "resolution",
				auditEntity: "resolution",
				action: "UPDATE",
			};
			try {
				const [rows] = await runNeonHttpTransaction<[ResolutionRow[]]>(
					(sql) => [
						sql`
						WITH updated AS (
							UPDATE ca_resolution
							SET
								status = ${record.status}::text,
								revoked_date = ${record.revokedDate}::date,
								revocation_reason = ${record.revocationReason}::text,
								revocation_evidence_reference = ${record.revocationEvidenceReference}::text,
								updated_by = ${record.updatedBy}::text,
								version = ${expectedVersion + 1},
								updated_at = now()
							WHERE organization_id = ${record.organizationId}
								AND id = ${record.id}
								AND version = ${expectedVersion}
							RETURNING *
						),
						${governanceFactsCtes(sql, "updated", factsInput)}
						SELECT updated.* FROM updated, audited, emitted
					`,
					],
				);
				return rows[0] ? ok(mapResolution(rows[0])) : versionConflict();
			} catch (error) {
				return failFromUnknown(error, "Failed to revoke resolution");
			}
		},
	};
}
