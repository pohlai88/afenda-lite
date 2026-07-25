import { randomUUID } from "node:crypto";

import { fail, ok, type Result } from "@afenda/errors/result";

import { CA_ERROR_CODE_CONFLICT, caErrorDetails } from "./error-codes";
import type { GovernanceStore, MutationPorts } from "./ports";
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
} from "./schemas";
import {
	type GovernanceMutationMeta,
	recordGovernanceFacts,
} from "./shared/governance-mutation-facts";

function clone<T>(value: T): T {
	return structuredClone(value);
}

function governanceFactValue(value: object): Record<string, unknown> {
	return value as unknown as Record<string, unknown>;
}

async function recordGovernanceCreate(
	ports: MutationPorts,
	meta: GovernanceMutationMeta,
	input: {
		entityType:
			| "officer_appointment"
			| "governance_body"
			| "governance_membership"
			| "authority_mandate"
			| "company_premise"
			| "governance_meeting"
			| "resolution";
		auditEntity: string;
		record: {
			organizationId: string;
			legalCompanyId: string;
			id: string;
			version: number;
			createdBy: string;
		};
		status: string;
		newValue: object;
		effectiveFrom?: string;
		effectiveTo?: string | null;
		supersedesId?: string | null;
	},
) {
	return recordGovernanceFacts(ports, meta, {
		organizationId: input.record.organizationId,
		legalCompanyId: input.record.legalCompanyId,
		entityType: input.entityType,
		entityId: input.record.id,
		version: input.record.version,
		actorUserId: input.record.createdBy,
		status: input.status,
		action: "CREATE",
		auditEntity: input.auditEntity,
		newValue: governanceFactValue(input.newValue),
		...(input.effectiveFrom !== undefined
			? { effectiveFrom: input.effectiveFrom }
			: {}),
		...(input.effectiveTo !== undefined
			? { effectiveTo: input.effectiveTo }
			: {}),
		...(input.supersedesId !== undefined
			? { supersedesId: input.supersedesId }
			: {}),
	});
}

async function recordGovernanceUpdate(
	ports: MutationPorts,
	meta: GovernanceMutationMeta,
	input: {
		entityType:
			| "officer_appointment"
			| "governance_body"
			| "governance_membership"
			| "authority_mandate"
			| "company_premise"
			| "governance_meeting"
			| "resolution";
		auditEntity: string;
		record: {
			organizationId: string;
			legalCompanyId: string;
			id: string;
			version: number;
			updatedBy: string;
		};
		status: string;
		oldValue: object;
		newValue: object;
		effectiveFrom?: string;
		effectiveTo?: string | null;
		supersedesId?: string | null;
	},
) {
	return recordGovernanceFacts(ports, meta, {
		organizationId: input.record.organizationId,
		legalCompanyId: input.record.legalCompanyId,
		entityType: input.entityType,
		entityId: input.record.id,
		version: input.record.version,
		actorUserId: input.record.updatedBy,
		status: input.status,
		action: "UPDATE",
		auditEntity: input.auditEntity,
		oldValue: governanceFactValue(input.oldValue),
		newValue: governanceFactValue(input.newValue),
		...(input.effectiveFrom !== undefined
			? { effectiveFrom: input.effectiveFrom }
			: {}),
		...(input.effectiveTo !== undefined
			? { effectiveTo: input.effectiveTo }
			: {}),
		...(input.supersedesId !== undefined
			? { supersedesId: input.supersedesId }
			: {}),
	});
}

function filterByCompany<
	T extends { organizationId: string; legalCompanyId: string },
>(rows: Iterable<T>, organizationId: string, legalCompanyId: string): T[] {
	return [...rows].filter(
		(row) =>
			row.organizationId === organizationId &&
			row.legalCompanyId === legalCompanyId,
	);
}

function findByIdempotency<
	T extends { organizationId: string; createIdempotencyKey: string },
>(rows: Iterable<T>, organizationId: string, idempotencyKey: string): T | null {
	for (const row of rows) {
		if (
			row.organizationId === organizationId &&
			row.createIdempotencyKey === idempotencyKey
		) {
			return row;
		}
	}
	return null;
}

function rangesOverlap(
	leftFrom: string,
	leftTo: string | null,
	rightFrom: string,
	rightTo: string | null,
): boolean {
	return (
		(rightTo === null || leftFrom < rightTo) &&
		(leftTo === null || rightFrom < leftTo)
	);
}

export class MemoryGovernanceStore implements GovernanceStore {
	protected readonly officerAppointments = new Map<
		string,
		CaOfficerAppointment
	>();
	protected readonly governanceBodies = new Map<string, CaGovernanceBody>();
	protected readonly governanceMemberships = new Map<
		string,
		CaGovernanceMembership
	>();
	protected readonly authorityMandates = new Map<string, CaAuthorityMandate>();
	protected readonly authorityMandateHolders = new Map<
		string,
		CaAuthorityMandateHolder
	>();
	protected readonly companyPremises = new Map<string, CaCompanyPremise>();
	protected readonly governanceMeetings = new Map<
		string,
		CaGovernanceMeeting
	>();
	protected readonly resolutions = new Map<string, CaResolution>();

	private versionConflict() {
		return fail(
			"CONFLICT",
			"Record version is stale",
			caErrorDetails("corporate-administration.company.version_conflict"),
		);
	}

	private fingerprintConflict() {
		return fail(
			"CONFLICT",
			"Idempotency key was already used with a different request",
			caErrorDetails("corporate-administration.idempotency.conflict"),
		);
	}

	private replay<T extends { requestFingerprint: string }>(
		existing: T,
		requestFingerprint: string,
	): Result<T> {
		return existing.requestFingerprint === requestFingerprint
			? ok(clone(existing))
			: this.fingerprintConflict();
	}

	private mandateDetail(mandate: CaAuthorityMandate): CaAuthorityMandateDetail {
		const holders = [...this.authorityMandateHolders.values()]
			.filter(
				(holder) =>
					holder.organizationId === mandate.organizationId &&
					holder.authorityMandateId === mandate.id,
			)
			.sort(
				(left, right) =>
					left.effectiveFrom.localeCompare(right.effectiveFrom) ||
					left.id.localeCompare(right.id),
			)
			.map(clone);
		return { ...clone(mandate), holders };
	}

	async getOfficerByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaOfficerAppointment | null>> {
		const row = findByIdempotency(
			this.officerAppointments.values(),
			organizationId,
			idempotencyKey,
		);
		return ok(row ? clone(row) : null);
	}

	async createOfficerAppointment(
		record: Omit<
			CaOfficerAppointment,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
		ports: MutationPorts,
		meta: GovernanceMutationMeta,
	): Promise<Result<CaOfficerAppointment>> {
		const existing = findByIdempotency(
			this.officerAppointments.values(),
			record.organizationId,
			record.createIdempotencyKey,
		);
		if (existing) return this.replay(existing, record.requestFingerprint);
		for (const officer of this.officerAppointments.values()) {
			if (
				officer.organizationId === record.organizationId &&
				officer.legalCompanyId === record.legalCompanyId &&
				officer.partyId === record.partyId &&
				officer.officerRole === record.officerRole &&
				officer.status === "active" &&
				rangesOverlap(
					officer.appointedDate,
					officer.resignedDate,
					record.appointedDate,
					record.resignedDate,
				)
			) {
				return fail(
					"CONFLICT",
					"Officer appointment overlaps an active appointment",
				);
			}
		}
		const now = new Date();
		const row: CaOfficerAppointment = {
			id: randomUUID(),
			...record,
			version: 1,
			createdAt: now,
			updatedAt: now,
		};
		const facts = await recordGovernanceCreate(ports, meta, {
			entityType: "officer_appointment",
			auditEntity: "officer_appointment",
			record: row,
			status: row.status,
			newValue: row,
			effectiveFrom: row.appointedDate,
			effectiveTo: row.resignedDate,
			supersedesId: row.supersedesOfficerAppointmentId,
		});
		if (!facts.ok) return facts;
		this.officerAppointments.set(row.id, row);
		return ok(clone(row));
	}

	async getOfficerAppointmentById(
		organizationId: string,
		officerAppointmentId: string,
	): Promise<Result<CaOfficerAppointment | null>> {
		const row = this.officerAppointments.get(officerAppointmentId);
		if (!row || row.organizationId !== organizationId) return ok(null);
		return ok(clone(row));
	}

	async listOfficerAppointments(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaOfficerAppointment[]>> {
		return ok(
			filterByCompany(
				this.officerAppointments.values(),
				organizationId,
				legalCompanyId,
			)
				.sort(
					(left, right) =>
						left.appointedDate.localeCompare(right.appointedDate) ||
						left.id.localeCompare(right.id),
				)
				.map(clone),
		);
	}

	async getGovernanceBodyByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaGovernanceBody | null>> {
		const row = findByIdempotency(
			this.governanceBodies.values(),
			organizationId,
			idempotencyKey,
		);
		return ok(row ? clone(row) : null);
	}

	async createGovernanceBody(
		record: Omit<
			CaGovernanceBody,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
		ports: MutationPorts,
		meta: GovernanceMutationMeta,
	): Promise<Result<CaGovernanceBody>> {
		const existing = findByIdempotency(
			this.governanceBodies.values(),
			record.organizationId,
			record.createIdempotencyKey,
		);
		if (existing) return this.replay(existing, record.requestFingerprint);
		for (const body of this.governanceBodies.values()) {
			if (
				body.organizationId === record.organizationId &&
				body.legalCompanyId === record.legalCompanyId &&
				body.normalizedCode === record.normalizedCode &&
				body.status === "active" &&
				record.status === "active"
			) {
				return fail(
					"CONFLICT",
					"Governance body code already exists",
					caErrorDetails(CA_ERROR_CODE_CONFLICT),
				);
			}
		}
		const now = new Date();
		const row: CaGovernanceBody = {
			id: randomUUID(),
			...record,
			version: 1,
			createdAt: now,
			updatedAt: now,
		};
		const facts = await recordGovernanceCreate(ports, meta, {
			entityType: "governance_body",
			auditEntity: "governance_body",
			record: row,
			status: row.status,
			newValue: row,
		});
		if (!facts.ok) return facts;
		this.governanceBodies.set(row.id, row);
		return ok(clone(row));
	}

	async getGovernanceBodyById(
		organizationId: string,
		governanceBodyId: string,
	): Promise<Result<CaGovernanceBody | null>> {
		const row = this.governanceBodies.get(governanceBodyId);
		if (!row || row.organizationId !== organizationId) return ok(null);
		return ok(clone(row));
	}

	async listGovernanceBodies(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaGovernanceBody[]>> {
		return ok(
			filterByCompany(
				this.governanceBodies.values(),
				organizationId,
				legalCompanyId,
			)
				.sort(
					(left, right) =>
						left.normalizedCode.localeCompare(right.normalizedCode) ||
						left.id.localeCompare(right.id),
				)
				.map(clone),
		);
	}

	async getGovernanceMembershipByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaGovernanceMembership | null>> {
		const row = findByIdempotency(
			this.governanceMemberships.values(),
			organizationId,
			idempotencyKey,
		);
		return ok(row ? clone(row) : null);
	}

	async createGovernanceMembership(
		record: Omit<
			CaGovernanceMembership,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
		ports: MutationPorts,
		meta: GovernanceMutationMeta,
	): Promise<Result<CaGovernanceMembership>> {
		const existing = findByIdempotency(
			this.governanceMemberships.values(),
			record.organizationId,
			record.createIdempotencyKey,
		);
		if (existing) return this.replay(existing, record.requestFingerprint);
		const body = this.governanceBodies.get(record.governanceBodyId);
		if (
			!body ||
			body.organizationId !== record.organizationId ||
			body.legalCompanyId !== record.legalCompanyId
		) {
			return fail("NOT_FOUND", "Governance body not found");
		}
		for (const membership of this.governanceMemberships.values()) {
			const sameSubject =
				(record.memberPartyId !== null &&
					membership.memberPartyId === record.memberPartyId) ||
				(record.officerAppointmentId !== null &&
					membership.officerAppointmentId === record.officerAppointmentId);
			if (
				membership.organizationId === record.organizationId &&
				membership.governanceBodyId === record.governanceBodyId &&
				sameSubject &&
				rangesOverlap(
					membership.effectiveFrom,
					membership.effectiveTo,
					record.effectiveFrom,
					record.effectiveTo,
				)
			) {
				return fail("CONFLICT", "Governance membership range overlaps");
			}
		}
		const now = new Date();
		const row: CaGovernanceMembership = {
			id: randomUUID(),
			...record,
			version: 1,
			createdAt: now,
			updatedAt: now,
		};
		const facts = await recordGovernanceCreate(ports, meta, {
			entityType: "governance_membership",
			auditEntity: "governance_membership",
			record: row,
			status: row.effectiveTo ? "ended" : "active",
			newValue: row,
			effectiveFrom: row.effectiveFrom,
			effectiveTo: row.effectiveTo,
		});
		if (!facts.ok) return facts;
		this.governanceMemberships.set(row.id, row);
		return ok(clone(row));
	}

	async getGovernanceMembershipById(
		organizationId: string,
		governanceMembershipId: string,
	): Promise<Result<CaGovernanceMembership | null>> {
		const row = this.governanceMemberships.get(governanceMembershipId);
		if (!row || row.organizationId !== organizationId) return ok(null);
		return ok(clone(row));
	}

	async listGovernanceMemberships(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaGovernanceMembership[]>> {
		return ok(
			filterByCompany(
				this.governanceMemberships.values(),
				organizationId,
				legalCompanyId,
			)
				.sort(
					(left, right) =>
						left.effectiveFrom.localeCompare(right.effectiveFrom) ||
						left.id.localeCompare(right.id),
				)
				.map(clone),
		);
	}

	async getAuthorityMandateByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaAuthorityMandate | null>> {
		const row = findByIdempotency(
			this.authorityMandates.values(),
			organizationId,
			idempotencyKey,
		);
		return ok(row ? clone(row) : null);
	}

	async createAuthorityMandate(
		record: Omit<
			CaAuthorityMandate,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
		holders: ReadonlyArray<
			Omit<CaAuthorityMandateHolder, "id" | "authorityMandateId" | "createdAt">
		>,
		ports: MutationPorts,
		meta: GovernanceMutationMeta,
	): Promise<Result<CaAuthorityMandateDetail>> {
		const existing = findByIdempotency(
			this.authorityMandates.values(),
			record.organizationId,
			record.createIdempotencyKey,
		);
		if (existing) {
			const replayed = this.replay(existing, record.requestFingerprint);
			if (!replayed.ok) return replayed;
			return ok(this.mandateDetail(replayed.data));
		}
		const now = new Date();
		const row: CaAuthorityMandate = {
			id: randomUUID(),
			...record,
			version: 1,
			createdAt: now,
			updatedAt: now,
		};
		const facts = await recordGovernanceCreate(ports, meta, {
			entityType: "authority_mandate",
			auditEntity: "authority_mandate",
			record: row,
			status: row.status,
			newValue: row,
			effectiveFrom: row.effectiveFrom,
			effectiveTo: row.effectiveTo,
			supersedesId: row.supersedesAuthorityMandateId,
		});
		if (!facts.ok) return facts;
		this.authorityMandates.set(row.id, row);
		for (const holder of holders) {
			const holderRow: CaAuthorityMandateHolder = {
				id: randomUUID(),
				authorityMandateId: row.id,
				...holder,
				createdAt: now,
			};
			this.authorityMandateHolders.set(holderRow.id, holderRow);
		}
		return ok(this.mandateDetail(row));
	}

	async getAuthorityMandateById(
		organizationId: string,
		authorityMandateId: string,
	): Promise<Result<CaAuthorityMandateDetail | null>> {
		const row = this.authorityMandates.get(authorityMandateId);
		if (!row || row.organizationId !== organizationId) return ok(null);
		return ok(this.mandateDetail(row));
	}

	async listAuthorityMandates(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaAuthorityMandateDetail[]>> {
		return ok(
			filterByCompany(
				this.authorityMandates.values(),
				organizationId,
				legalCompanyId,
			)
				.sort(
					(left, right) =>
						left.effectiveFrom.localeCompare(right.effectiveFrom) ||
						left.id.localeCompare(right.id),
				)
				.map((row) => this.mandateDetail(row)),
		);
	}

	async getCompanyPremiseByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaCompanyPremise | null>> {
		const row = findByIdempotency(
			this.companyPremises.values(),
			organizationId,
			idempotencyKey,
		);
		return ok(row ? clone(row) : null);
	}

	async createCompanyPremise(
		record: Omit<
			CaCompanyPremise,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
		ports: MutationPorts,
		meta: GovernanceMutationMeta,
	): Promise<Result<CaCompanyPremise>> {
		const existing = findByIdempotency(
			this.companyPremises.values(),
			record.organizationId,
			record.createIdempotencyKey,
		);
		if (existing) return this.replay(existing, record.requestFingerprint);
		if (
			record.premiseType === "registered_office" &&
			record.isPrimary &&
			[...this.companyPremises.values()].some(
				(premise) =>
					premise.organizationId === record.organizationId &&
					premise.legalCompanyId === record.legalCompanyId &&
					premise.premiseType === "registered_office" &&
					premise.isPrimary &&
					premise.status === "active" &&
					rangesOverlap(
						premise.effectiveFrom,
						premise.effectiveTo,
						record.effectiveFrom,
						record.effectiveTo,
					),
			)
		) {
			return fail("CONFLICT", "Primary registered office range overlaps");
		}
		const now = new Date();
		const row: CaCompanyPremise = {
			id: randomUUID(),
			...record,
			version: 1,
			createdAt: now,
			updatedAt: now,
		};
		const facts = await recordGovernanceCreate(ports, meta, {
			entityType: "company_premise",
			auditEntity: "company_premise",
			record: row,
			status: row.status,
			newValue: row,
			effectiveFrom: row.effectiveFrom,
			effectiveTo: row.effectiveTo,
			supersedesId: row.supersedesCompanyPremiseId,
		});
		if (!facts.ok) return facts;
		this.companyPremises.set(row.id, row);
		return ok(clone(row));
	}

	async getCompanyPremiseById(
		organizationId: string,
		companyPremiseId: string,
	): Promise<Result<CaCompanyPremise | null>> {
		const row = this.companyPremises.get(companyPremiseId);
		if (!row || row.organizationId !== organizationId) return ok(null);
		return ok(clone(row));
	}

	async listCompanyPremises(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaCompanyPremise[]>> {
		return ok(
			filterByCompany(
				this.companyPremises.values(),
				organizationId,
				legalCompanyId,
			)
				.sort(
					(left, right) =>
						left.effectiveFrom.localeCompare(right.effectiveFrom) ||
						left.id.localeCompare(right.id),
				)
				.map(clone),
		);
	}

	async getGovernanceMeetingByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaGovernanceMeeting | null>> {
		const row = findByIdempotency(
			this.governanceMeetings.values(),
			organizationId,
			idempotencyKey,
		);
		return ok(row ? clone(row) : null);
	}

	async createGovernanceMeeting(
		record: Omit<
			CaGovernanceMeeting,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
		ports: MutationPorts,
		meta: GovernanceMutationMeta,
	): Promise<Result<CaGovernanceMeeting>> {
		const existing = findByIdempotency(
			this.governanceMeetings.values(),
			record.organizationId,
			record.createIdempotencyKey,
		);
		if (existing) return this.replay(existing, record.requestFingerprint);
		const body = this.governanceBodies.get(record.governanceBodyId);
		if (
			!body ||
			body.organizationId !== record.organizationId ||
			body.legalCompanyId !== record.legalCompanyId
		) {
			return fail("NOT_FOUND", "Governance body not found");
		}
		const now = new Date();
		const row: CaGovernanceMeeting = {
			id: randomUUID(),
			...record,
			version: 1,
			createdAt: now,
			updatedAt: now,
		};
		const facts = await recordGovernanceCreate(ports, meta, {
			entityType: "governance_meeting",
			auditEntity: "governance_meeting",
			record: row,
			status: row.status,
			newValue: row,
		});
		if (!facts.ok) return facts;
		this.governanceMeetings.set(row.id, row);
		return ok(clone(row));
	}

	async getGovernanceMeetingById(
		organizationId: string,
		governanceMeetingId: string,
	): Promise<Result<CaGovernanceMeeting | null>> {
		const row = this.governanceMeetings.get(governanceMeetingId);
		if (!row || row.organizationId !== organizationId) return ok(null);
		return ok(clone(row));
	}

	async listGovernanceMeetings(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaGovernanceMeeting[]>> {
		return ok(
			filterByCompany(
				this.governanceMeetings.values(),
				organizationId,
				legalCompanyId,
			)
				.sort(
					(left, right) =>
						left.meetingAt.getTime() - right.meetingAt.getTime() ||
						left.id.localeCompare(right.id),
				)
				.map(clone),
		);
	}

	async getResolutionByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaResolution | null>> {
		const row = findByIdempotency(
			this.resolutions.values(),
			organizationId,
			idempotencyKey,
		);
		return ok(row ? clone(row) : null);
	}

	async createResolution(
		record: Omit<CaResolution, "id" | "version" | "createdAt" | "updatedAt">,
		ports: MutationPorts,
		meta: GovernanceMutationMeta,
	): Promise<Result<CaResolution>> {
		const existing = findByIdempotency(
			this.resolutions.values(),
			record.organizationId,
			record.createIdempotencyKey,
		);
		if (existing) return this.replay(existing, record.requestFingerprint);
		if (record.governanceMeetingId) {
			const meeting = this.governanceMeetings.get(record.governanceMeetingId);
			if (
				!meeting ||
				meeting.organizationId !== record.organizationId ||
				meeting.legalCompanyId !== record.legalCompanyId
			) {
				return fail("NOT_FOUND", "Governance meeting not found");
			}
		}
		for (const resolution of this.resolutions.values()) {
			if (
				resolution.organizationId === record.organizationId &&
				resolution.legalCompanyId === record.legalCompanyId &&
				resolution.resolutionYear === record.resolutionYear &&
				resolution.resolutionNumber === record.resolutionNumber
			) {
				return fail(
					"CONFLICT",
					"Resolution number already exists for year",
					caErrorDetails(CA_ERROR_CODE_CONFLICT),
				);
			}
		}
		const now = new Date();
		const row: CaResolution = {
			id: randomUUID(),
			...record,
			version: 1,
			createdAt: now,
			updatedAt: now,
		};
		const facts = await recordGovernanceCreate(ports, meta, {
			entityType: "resolution",
			auditEntity: "resolution",
			record: row,
			status: row.status,
			newValue: row,
			effectiveFrom: row.approvedDate ?? undefined,
			supersedesId: row.supersedesResolutionId,
		});
		if (!facts.ok) return facts;
		this.resolutions.set(row.id, row);
		return ok(clone(row));
	}

	async getResolutionById(
		organizationId: string,
		resolutionId: string,
	): Promise<Result<CaResolution | null>> {
		const row = this.resolutions.get(resolutionId);
		if (!row || row.organizationId !== organizationId) return ok(null);
		return ok(clone(row));
	}

	async listResolutions(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaResolution[]>> {
		return ok(
			filterByCompany(this.resolutions.values(), organizationId, legalCompanyId)
				.sort(
					(left, right) =>
						right.resolutionYear - left.resolutionYear ||
						left.resolutionNumber.localeCompare(right.resolutionNumber) ||
						left.id.localeCompare(right.id),
				)
				.map(clone),
		);
	}

	async supersedeOfficerAppointment(
		current: CaOfficerAppointment,
		replacement: Omit<
			CaOfficerAppointment,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
		expectedVersion: number,
		ports: MutationPorts,
		meta: GovernanceMutationMeta,
	): Promise<Result<CaOfficerAppointment>> {
		const stored = this.officerAppointments.get(current.id);
		if (
			!stored ||
			stored.organizationId !== current.organizationId ||
			stored.version !== expectedVersion
		) {
			return this.versionConflict();
		}
		const existing = findByIdempotency(
			this.officerAppointments.values(),
			replacement.organizationId,
			replacement.createIdempotencyKey,
		);
		if (existing) return this.replay(existing, replacement.requestFingerprint);
		const now = new Date();
		const updatedCurrent: CaOfficerAppointment = {
			...clone(current),
			version: expectedVersion + 1,
			updatedAt: now,
		};
		const successor: CaOfficerAppointment = {
			id: randomUUID(),
			...replacement,
			version: 1,
			createdAt: now,
			updatedAt: now,
		};
		const updateFacts = await recordGovernanceUpdate(ports, meta, {
			entityType: "officer_appointment",
			auditEntity: "officer_appointment",
			record: updatedCurrent,
			status: updatedCurrent.status,
			oldValue: stored,
			newValue: updatedCurrent,
			effectiveFrom: updatedCurrent.appointedDate,
			effectiveTo: updatedCurrent.resignedDate,
			supersedesId: updatedCurrent.supersedesOfficerAppointmentId,
		});
		if (!updateFacts.ok) return updateFacts;
		const createFacts = await recordGovernanceCreate(ports, meta, {
			entityType: "officer_appointment",
			auditEntity: "officer_appointment",
			record: successor,
			status: successor.status,
			newValue: successor,
			effectiveFrom: successor.appointedDate,
			effectiveTo: successor.resignedDate,
			supersedesId: successor.supersedesOfficerAppointmentId,
		});
		if (!createFacts.ok) return createFacts;
		this.officerAppointments.set(updatedCurrent.id, updatedCurrent);
		this.officerAppointments.set(successor.id, successor);
		return ok(clone(successor));
	}

	async endOfficerAppointment(
		record: CaOfficerAppointment,
		expectedVersion: number,
		ports: MutationPorts,
		meta: GovernanceMutationMeta,
	): Promise<Result<CaOfficerAppointment>> {
		const stored = this.officerAppointments.get(record.id);
		if (!stored || stored.version !== expectedVersion)
			return this.versionConflict();
		const updated = {
			...clone(record),
			version: expectedVersion + 1,
			updatedAt: new Date(),
		};
		const facts = await recordGovernanceUpdate(ports, meta, {
			entityType: "officer_appointment",
			auditEntity: "officer_appointment",
			record: updated,
			status: updated.status,
			oldValue: stored,
			newValue: updated,
			effectiveFrom: updated.appointedDate,
			effectiveTo: updated.resignedDate,
			supersedesId: updated.supersedesOfficerAppointmentId,
		});
		if (!facts.ok) return facts;
		this.officerAppointments.set(updated.id, updated);
		return ok(clone(updated));
	}

	async updateGovernanceBody(
		record: CaGovernanceBody,
		expectedVersion: number,
		ports: MutationPorts,
		meta: GovernanceMutationMeta,
	): Promise<Result<CaGovernanceBody>> {
		const stored = this.governanceBodies.get(record.id);
		if (!stored || stored.version !== expectedVersion)
			return this.versionConflict();
		const updated = {
			...clone(record),
			version: expectedVersion + 1,
			updatedAt: new Date(),
		};
		const facts = await recordGovernanceUpdate(ports, meta, {
			entityType: "governance_body",
			auditEntity: "governance_body",
			record: updated,
			status: updated.status,
			oldValue: stored,
			newValue: updated,
		});
		if (!facts.ok) return facts;
		this.governanceBodies.set(updated.id, updated);
		return ok(clone(updated));
	}

	async endGovernanceMembership(
		record: CaGovernanceMembership,
		expectedVersion: number,
		ports: MutationPorts,
		meta: GovernanceMutationMeta,
	): Promise<Result<CaGovernanceMembership>> {
		const stored = this.governanceMemberships.get(record.id);
		if (!stored || stored.version !== expectedVersion)
			return this.versionConflict();
		const updated = {
			...clone(record),
			version: expectedVersion + 1,
			updatedAt: new Date(),
		};
		const facts = await recordGovernanceUpdate(ports, meta, {
			entityType: "governance_membership",
			auditEntity: "governance_membership",
			record: updated,
			status: updated.effectiveTo ? "ended" : "active",
			oldValue: stored,
			newValue: updated,
			effectiveFrom: updated.effectiveFrom,
			effectiveTo: updated.effectiveTo,
		});
		if (!facts.ok) return facts;
		this.governanceMemberships.set(updated.id, updated);
		return ok(clone(updated));
	}

	async supersedeAuthorityMandate(
		current: CaAuthorityMandateDetail,
		replacement: Omit<
			CaAuthorityMandate,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
		holders: ReadonlyArray<
			Omit<CaAuthorityMandateHolder, "id" | "authorityMandateId" | "createdAt">
		>,
		expectedVersion: number,
		ports: MutationPorts,
		meta: GovernanceMutationMeta,
	): Promise<Result<CaAuthorityMandateDetail>> {
		const stored = this.authorityMandates.get(current.id);
		if (!stored || stored.version !== expectedVersion)
			return this.versionConflict();
		const now = new Date();
		const { holders: _currentHolders, ...currentBase } = current;
		const updatedCurrent: CaAuthorityMandate = {
			...clone(currentBase),
			version: expectedVersion + 1,
			updatedAt: now,
		};
		const successor: CaAuthorityMandate = {
			id: randomUUID(),
			...replacement,
			version: 1,
			createdAt: now,
			updatedAt: now,
		};
		const updateFacts = await recordGovernanceUpdate(ports, meta, {
			entityType: "authority_mandate",
			auditEntity: "authority_mandate",
			record: updatedCurrent,
			status: updatedCurrent.status,
			oldValue: stored,
			newValue: updatedCurrent,
			effectiveFrom: updatedCurrent.effectiveFrom,
			effectiveTo: updatedCurrent.effectiveTo,
			supersedesId: updatedCurrent.supersedesAuthorityMandateId,
		});
		if (!updateFacts.ok) return updateFacts;
		const createFacts = await recordGovernanceCreate(ports, meta, {
			entityType: "authority_mandate",
			auditEntity: "authority_mandate",
			record: successor,
			status: successor.status,
			newValue: successor,
			effectiveFrom: successor.effectiveFrom,
			effectiveTo: successor.effectiveTo,
			supersedesId: successor.supersedesAuthorityMandateId,
		});
		if (!createFacts.ok) return createFacts;
		this.authorityMandates.set(updatedCurrent.id, updatedCurrent);
		this.authorityMandates.set(successor.id, successor);
		for (const holder of holders) {
			const holderRow: CaAuthorityMandateHolder = {
				id: randomUUID(),
				authorityMandateId: successor.id,
				...holder,
				createdAt: now,
			};
			this.authorityMandateHolders.set(holderRow.id, holderRow);
		}
		return ok(this.mandateDetail(successor));
	}

	async revokeAuthorityMandate(
		record: CaAuthorityMandateDetail,
		expectedVersion: number,
		ports: MutationPorts,
		meta: GovernanceMutationMeta,
	): Promise<Result<CaAuthorityMandateDetail>> {
		const stored = this.authorityMandates.get(record.id);
		if (!stored || stored.version !== expectedVersion)
			return this.versionConflict();
		const { holders: _holders, ...base } = record;
		const updated: CaAuthorityMandate = {
			...clone(base),
			version: expectedVersion + 1,
			updatedAt: new Date(),
		};
		const facts = await recordGovernanceUpdate(ports, meta, {
			entityType: "authority_mandate",
			auditEntity: "authority_mandate",
			record: updated,
			status: updated.status,
			oldValue: stored,
			newValue: updated,
			effectiveFrom: updated.effectiveFrom,
			effectiveTo: updated.effectiveTo,
			supersedesId: updated.supersedesAuthorityMandateId,
		});
		if (!facts.ok) return facts;
		this.authorityMandates.set(updated.id, updated);
		return ok(this.mandateDetail(updated));
	}

	async supersedeCompanyPremise(
		current: CaCompanyPremise,
		replacement: Omit<
			CaCompanyPremise,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
		expectedVersion: number,
		ports: MutationPorts,
		meta: GovernanceMutationMeta,
	): Promise<Result<CaCompanyPremise>> {
		const stored = this.companyPremises.get(current.id);
		if (!stored || stored.version !== expectedVersion)
			return this.versionConflict();
		const now = new Date();
		const updatedCurrent: CaCompanyPremise = {
			...clone(current),
			version: expectedVersion + 1,
			updatedAt: now,
		};
		const successor: CaCompanyPremise = {
			id: randomUUID(),
			...replacement,
			version: 1,
			createdAt: now,
			updatedAt: now,
		};
		const updateFacts = await recordGovernanceUpdate(ports, meta, {
			entityType: "company_premise",
			auditEntity: "company_premise",
			record: updatedCurrent,
			status: updatedCurrent.status,
			oldValue: stored,
			newValue: updatedCurrent,
			effectiveFrom: updatedCurrent.effectiveFrom,
			effectiveTo: updatedCurrent.effectiveTo,
			supersedesId: updatedCurrent.supersedesCompanyPremiseId,
		});
		if (!updateFacts.ok) return updateFacts;
		const createFacts = await recordGovernanceCreate(ports, meta, {
			entityType: "company_premise",
			auditEntity: "company_premise",
			record: successor,
			status: successor.status,
			newValue: successor,
			effectiveFrom: successor.effectiveFrom,
			effectiveTo: successor.effectiveTo,
			supersedesId: successor.supersedesCompanyPremiseId,
		});
		if (!createFacts.ok) return createFacts;
		this.companyPremises.set(updatedCurrent.id, updatedCurrent);
		this.companyPremises.set(successor.id, successor);
		return ok(clone(successor));
	}

	async retireCompanyPremise(
		record: CaCompanyPremise,
		expectedVersion: number,
		ports: MutationPorts,
		meta: GovernanceMutationMeta,
	): Promise<Result<CaCompanyPremise>> {
		const stored = this.companyPremises.get(record.id);
		if (!stored || stored.version !== expectedVersion)
			return this.versionConflict();
		const updated = {
			...clone(record),
			version: expectedVersion + 1,
			updatedAt: new Date(),
		};
		const facts = await recordGovernanceUpdate(ports, meta, {
			entityType: "company_premise",
			auditEntity: "company_premise",
			record: updated,
			status: updated.status,
			oldValue: stored,
			newValue: updated,
			effectiveFrom: updated.effectiveFrom,
			effectiveTo: updated.effectiveTo,
			supersedesId: updated.supersedesCompanyPremiseId,
		});
		if (!facts.ok) return facts;
		this.companyPremises.set(updated.id, updated);
		return ok(clone(updated));
	}

	async closeGovernanceMeeting(
		record: CaGovernanceMeeting,
		expectedVersion: number,
		ports: MutationPorts,
		meta: GovernanceMutationMeta,
	): Promise<Result<CaGovernanceMeeting>> {
		const stored = this.governanceMeetings.get(record.id);
		if (!stored || stored.version !== expectedVersion)
			return this.versionConflict();
		const updated = {
			...clone(record),
			version: expectedVersion + 1,
			updatedAt: new Date(),
		};
		const facts = await recordGovernanceUpdate(ports, meta, {
			entityType: "governance_meeting",
			auditEntity: "governance_meeting",
			record: updated,
			status: updated.status,
			oldValue: stored,
			newValue: updated,
		});
		if (!facts.ok) return facts;
		this.governanceMeetings.set(updated.id, updated);
		return ok(clone(updated));
	}

	async approveResolution(
		record: CaResolution,
		expectedVersion: number,
		ports: MutationPorts,
		meta: GovernanceMutationMeta,
		predecessor?: CaResolution,
		predecessorMeta?: GovernanceMutationMeta,
	): Promise<Result<CaResolution>> {
		const stored = this.resolutions.get(record.id);
		if (!stored || stored.version !== expectedVersion)
			return this.versionConflict();
		if (predecessor) {
			const storedPredecessor = this.resolutions.get(predecessor.id);
			if (
				!storedPredecessor ||
				storedPredecessor.version !== predecessor.version
			) {
				return this.versionConflict();
			}
		}
		const now = new Date();
		let updatedPredecessor: CaResolution | undefined;
		if (predecessor) {
			const storedPredecessor = this.resolutions.get(predecessor.id)!;
			updatedPredecessor = {
				...clone(predecessor),
				version: predecessor.version + 1,
				updatedAt: now,
			};
			const predecessorFacts = await recordGovernanceUpdate(
				ports,
				predecessorMeta ?? meta,
				{
					entityType: "resolution",
					auditEntity: "resolution",
					record: updatedPredecessor,
					status: updatedPredecessor.status,
					oldValue: storedPredecessor,
					newValue: updatedPredecessor,
					effectiveFrom: updatedPredecessor.approvedDate ?? undefined,
					supersedesId: updatedPredecessor.supersedesResolutionId,
				},
			);
			if (!predecessorFacts.ok) return predecessorFacts;
		}
		const updated = {
			...clone(record),
			version: expectedVersion + 1,
			updatedAt: now,
		};
		const approveFacts = await recordGovernanceUpdate(ports, meta, {
			entityType: "resolution",
			auditEntity: "resolution",
			record: updated,
			status: updated.status,
			oldValue: stored,
			newValue: updated,
			effectiveFrom: updated.approvedDate ?? undefined,
			supersedesId: updated.supersedesResolutionId,
		});
		if (!approveFacts.ok) return approveFacts;
		if (updatedPredecessor) {
			this.resolutions.set(updatedPredecessor.id, updatedPredecessor);
		}
		this.resolutions.set(updated.id, updated);
		return ok(clone(updated));
	}

	async revokeResolution(
		record: CaResolution,
		expectedVersion: number,
		ports: MutationPorts,
		meta: GovernanceMutationMeta,
	): Promise<Result<CaResolution>> {
		const stored = this.resolutions.get(record.id);
		if (!stored || stored.version !== expectedVersion)
			return this.versionConflict();
		const updated = {
			...clone(record),
			version: expectedVersion + 1,
			updatedAt: new Date(),
		};
		const facts = await recordGovernanceUpdate(ports, meta, {
			entityType: "resolution",
			auditEntity: "resolution",
			record: updated,
			status: updated.status,
			oldValue: stored,
			newValue: updated,
			effectiveFrom: updated.approvedDate ?? undefined,
			supersedesId: updated.supersedesResolutionId,
		});
		if (!facts.ok) return facts;
		this.resolutions.set(updated.id, updated);
		return ok(clone(updated));
	}
}
