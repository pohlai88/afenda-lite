import { randomUUID } from "node:crypto";

import { fail, ok, type Result } from "@afenda/errors/result";

import { CA_ERROR_CODE_CONFLICT, caErrorDetails } from "./error-codes";
import type { GovernanceStore } from "./ports";
import type {
	CaAuthorityMandate,
	CaCompanyPremise,
	CaGovernanceBody,
	CaGovernanceMeeting,
	CaGovernanceMembership,
	CaOfficerAppointment,
	CaResolution,
} from "./schemas";

function clone<T>(value: T): T {
	return structuredClone(value);
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
	protected readonly companyPremises = new Map<string, CaCompanyPremise>();
	protected readonly governanceMeetings = new Map<
		string,
		CaGovernanceMeeting
	>();
	protected readonly resolutions = new Map<string, CaResolution>();

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
	): Promise<Result<CaOfficerAppointment>> {
		const existing = findByIdempotency(
			this.officerAppointments.values(),
			record.organizationId,
			record.createIdempotencyKey,
		);
		if (existing) return ok(clone(existing));
		const now = new Date();
		const row: CaOfficerAppointment = {
			id: randomUUID(),
			...record,
			version: 1,
			createdAt: now,
			updatedAt: now,
		};
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
			).map(clone),
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
	): Promise<Result<CaGovernanceBody>> {
		const existing = findByIdempotency(
			this.governanceBodies.values(),
			record.organizationId,
			record.createIdempotencyKey,
		);
		if (existing) return ok(clone(existing));
		for (const body of this.governanceBodies.values()) {
			if (
				body.organizationId === record.organizationId &&
				body.legalCompanyId === record.legalCompanyId &&
				body.normalizedCode === record.normalizedCode
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
			).map(clone),
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
	): Promise<Result<CaGovernanceMembership>> {
		const existing = findByIdempotency(
			this.governanceMemberships.values(),
			record.organizationId,
			record.createIdempotencyKey,
		);
		if (existing) return ok(clone(existing));
		const body = this.governanceBodies.get(record.governanceBodyId);
		if (
			!body ||
			body.organizationId !== record.organizationId ||
			body.legalCompanyId !== record.legalCompanyId
		) {
			return fail("NOT_FOUND", "Governance body not found");
		}
		const now = new Date();
		const row: CaGovernanceMembership = {
			id: randomUUID(),
			...record,
			version: 1,
			createdAt: now,
			updatedAt: now,
		};
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
			).map(clone),
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
	): Promise<Result<CaAuthorityMandate>> {
		const existing = findByIdempotency(
			this.authorityMandates.values(),
			record.organizationId,
			record.createIdempotencyKey,
		);
		if (existing) return ok(clone(existing));
		const now = new Date();
		const row: CaAuthorityMandate = {
			id: randomUUID(),
			...record,
			version: 1,
			createdAt: now,
			updatedAt: now,
		};
		this.authorityMandates.set(row.id, row);
		return ok(clone(row));
	}

	async getAuthorityMandateById(
		organizationId: string,
		authorityMandateId: string,
	): Promise<Result<CaAuthorityMandate | null>> {
		const row = this.authorityMandates.get(authorityMandateId);
		if (!row || row.organizationId !== organizationId) return ok(null);
		return ok(clone(row));
	}

	async listAuthorityMandates(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaAuthorityMandate[]>> {
		return ok(
			filterByCompany(
				this.authorityMandates.values(),
				organizationId,
				legalCompanyId,
			).map(clone),
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
	): Promise<Result<CaCompanyPremise>> {
		const existing = findByIdempotency(
			this.companyPremises.values(),
			record.organizationId,
			record.createIdempotencyKey,
		);
		if (existing) return ok(clone(existing));
		const now = new Date();
		const row: CaCompanyPremise = {
			id: randomUUID(),
			...record,
			version: 1,
			createdAt: now,
			updatedAt: now,
		};
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
			).map(clone),
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
	): Promise<Result<CaGovernanceMeeting>> {
		const existing = findByIdempotency(
			this.governanceMeetings.values(),
			record.organizationId,
			record.createIdempotencyKey,
		);
		if (existing) return ok(clone(existing));
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
			).map(clone),
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
	): Promise<Result<CaResolution>> {
		const existing = findByIdempotency(
			this.resolutions.values(),
			record.organizationId,
			record.createIdempotencyKey,
		);
		if (existing) return ok(clone(existing));
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
			filterByCompany(
				this.resolutions.values(),
				organizationId,
				legalCompanyId,
			).map(clone),
		);
	}
}
