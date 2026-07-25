import { fail, ok, type Result } from "@afenda/errors/result";
import {
	CA_AUTHORITY_MANDATE_GRANTED_EVENT,
	CA_GOVERNANCE_BODY_CREATED_EVENT,
	CA_GOVERNANCE_MEMBERSHIP_APPOINTED_EVENT,
	CA_MEETING_CORRECTED_EVENT,
	CA_MEETING_RECORDED_EVENT,
	CA_OFFICER_APPOINTED_EVENT,
	CA_PREMISE_REGISTERED_EVENT,
	CA_RESOLUTION_RECORDED_EVENT,
} from "@afenda/events/schemas";

import {
	requireCaCommandPermission,
	requireCaQueryPermission,
} from "./authorization";
import {
	type CorporateAdministrationCommandOptions,
	resolveCommandDeps,
} from "./command-options";
import { CA_ERROR_PARTY_INVALID, caErrorDetails } from "./error-codes";
import {
	CA_COMMAND_AUTHORITY_MANDATE_GRANT,
	CA_COMMAND_GOVERNANCE_BODY_CREATE,
	CA_COMMAND_GOVERNANCE_MEETING_RECORD,
	CA_COMMAND_GOVERNANCE_MEMBERSHIP_APPOINT,
	CA_COMMAND_OFFICER_APPOINT,
	CA_COMMAND_PREMISE_REGISTER,
	CA_COMMAND_RESOLUTION_RECORD,
	CA_QUERY_AUTHORITY_MANDATE_GET,
	CA_QUERY_AUTHORITY_MANDATE_LIST,
	CA_QUERY_GOVERNANCE_BODY_GET,
	CA_QUERY_GOVERNANCE_BODY_LIST,
	CA_QUERY_GOVERNANCE_MEETING_GET,
	CA_QUERY_GOVERNANCE_MEETING_LIST,
	CA_QUERY_GOVERNANCE_MEMBERSHIP_GET,
	CA_QUERY_GOVERNANCE_MEMBERSHIP_LIST,
	CA_QUERY_OFFICER_GET,
	CA_QUERY_OFFICER_LIST,
	CA_QUERY_PREMISE_GET,
	CA_QUERY_PREMISE_LIST,
	CA_QUERY_RESOLUTION_GET,
	CA_QUERY_RESOLUTION_LIST,
} from "./module-ids";
import type { CorporateAdministrationMasterLookupPort } from "./ports";
import {
	type CaAuthorityMandateDetail,
	type CaAuthorityMandateHolder,
	type CaCompanyPremise,
	type CaGovernanceBody,
	type CaGovernanceMeeting,
	type CaGovernanceMembership,
	type CaOfficerAppointment,
	type CaResolution,
	createAuthorityMandateInputSchema,
	createCompanyPremiseInputSchema,
	createGovernanceBodyInputSchema,
	createGovernanceMeetingInputSchema,
	createGovernanceMembershipInputSchema,
	createOfficerAppointmentInputSchema,
	createResolutionInputSchema,
	getAuthorityMandateInputSchema,
	getCompanyPremiseInputSchema,
	getGovernanceBodyInputSchema,
	getGovernanceMeetingInputSchema,
	getGovernanceMembershipInputSchema,
	getOfficerAppointmentInputSchema,
	getResolutionInputSchema,
	listAuthorityMandatesInputSchema,
	listCompanyPremisesInputSchema,
	listGovernanceBodiesInputSchema,
	listGovernanceMeetingsInputSchema,
	listGovernanceMembershipsInputSchema,
	listOfficerAppointmentsInputSchema,
	listResolutionsInputSchema,
} from "./schemas";
import { normalizeCompanyCode } from "./shared/code";
import {
	appointmentEffectiveRange,
	isEffectiveOnDate,
} from "./shared/effective-range";
import { deriveCaCommandFingerprint } from "./shared/fingerprint";
import { replayIdempotencyFingerprint } from "./shared/idempotency-replay";

async function requireCompany(
	store: CorporateAdministrationCommandOptions["store"],
	organizationId: string,
	legalCompanyId: string,
): Promise<Result<{ id: string; legalPartyId: string }>> {
	const resolved = resolveCommandDeps({ store });
	const company = await resolved.store.getLegalCompany(
		organizationId,
		legalCompanyId,
	);
	if (!company.ok) return company;
	if (!company.data) return fail("NOT_FOUND", "Legal company not found");
	if (!company.data.legalPartyId) {
		return fail("CONFLICT", "Legal company must have a legal party");
	}
	return ok({ id: company.data.id, legalPartyId: company.data.legalPartyId });
}

function governanceFingerprint(
	command: string,
	input: Record<string, unknown>,
) {
	return deriveCaCommandFingerprint({ command }, input);
}

async function requireMasters(
	masters: CorporateAdministrationMasterLookupPort | undefined,
): Promise<Result<CorporateAdministrationMasterLookupPort>> {
	if (!masters) {
		return fail("INTERNAL_ERROR", "Master lookup port is required");
	}
	return ok(masters);
}

async function resolvePartySnapshot(
	masters: CorporateAdministrationMasterLookupPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		partyId: string;
	},
): Promise<Result<{ partyCode: string; partyName: string }>> {
	const masterPort = await requireMasters(masters);
	if (!masterPort.ok) return masterPort;
	const party = await masterPort.data.getPartyById({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		partyId: input.partyId,
	});
	if (!party.ok) return party;
	if (party.data?.status !== "active") {
		return fail(
			"CONFLICT",
			"Active party is required",
			caErrorDetails(CA_ERROR_PARTY_INVALID),
		);
	}
	return ok({ partyCode: party.data.code, partyName: party.data.name });
}

export async function appointOfficer(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaOfficerAppointment>> {
	const parsed = createOfficerAppointmentInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid officer appointment input", {
			issues: parsed.error.issues,
		});
	}
	const { store, ports, masters, governancePolicy, authorization } =
		resolveCommandDeps(options);
	const authorized = await requireCaCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: CA_COMMAND_OFFICER_APPOINT,
	});
	if (!authorized.ok) return authorized;

	const company = await requireCompany(
		store,
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!company.ok) return company;

	const existing = await store.getOfficerByIdempotencyKey(
		parsed.data.organizationId,
		parsed.data.idempotencyKey,
	);
	if (!existing.ok) return existing;
	const requestFingerprint = governanceFingerprint(
		CA_COMMAND_OFFICER_APPOINT,
		parsed.data,
	);
	if (existing.data)
		return replayIdempotencyFingerprint(existing.data, requestFingerprint);

	const party = await resolvePartySnapshot(masters, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		partyId: parsed.data.partyId,
	});
	if (!party.ok) return party;
	const appointments = await store.listOfficerAppointments(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!appointments.ok) return appointments;
	const policy = await governancePolicy.validateOfficerAppointment({
		organizationId: parsed.data.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		partyId: parsed.data.partyId,
		officerRole: parsed.data.officerRole,
		effectiveFrom: parsed.data.appointedDate,
		effectiveTo: null,
		existingAppointments: appointments.data,
	});
	if (!policy.ok) return policy;

	return store.createOfficerAppointment(
		{
			organizationId: parsed.data.organizationId,
			legalCompanyId: parsed.data.legalCompanyId,
			officerRole: parsed.data.officerRole,
			partyId: parsed.data.partyId,
			partyCodeSnapshot: party.data.partyCode,
			partyNameSnapshot: party.data.partyName,
			appointedDate: parsed.data.appointedDate,
			resignedDate: null,
			authorityLimits: parsed.data.authorityLimits ?? null,
			status: "active",
			createIdempotencyKey: parsed.data.idempotencyKey,
			requestFingerprint,
			supersedesOfficerAppointmentId: null,
			amendmentReason: null,
			endReason: null,
			endEvidenceReference: null,
			createdBy: parsed.data.actorUserId,
			updatedBy: parsed.data.actorUserId,
		},
		ports,
		{
			correlationId: parsed.data.correlationId,
			eventType: CA_OFFICER_APPOINTED_EVENT,
		},
	);
}

export async function getOfficerAppointment(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaOfficerAppointment>> {
	const parsed = getOfficerAppointmentInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid officer get input", {
			issues: parsed.error.issues,
		});
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_OFFICER_GET,
	});
	if (!authorized.ok) return authorized;
	const row = await store.getOfficerAppointmentById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!row.ok) return row;
	if (!row.data || row.data.legalCompanyId !== parsed.data.legalCompanyId) {
		return fail("NOT_FOUND", "Officer appointment not found");
	}
	return ok(row.data);
}

export async function listOfficerAppointments(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaOfficerAppointment[]>> {
	const parsed = listOfficerAppointmentsInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid officer list input", {
			issues: parsed.error.issues,
		});
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_OFFICER_LIST,
	});
	if (!authorized.ok) return authorized;
	const listed = await store.listOfficerAppointments(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!listed.ok || !parsed.data.asOf) return listed;
	const asOf = parsed.data.asOf;
	return ok(
		listed.data.filter((row) =>
			isEffectiveOnDate(appointmentEffectiveRange(row), asOf),
		),
	);
}

export async function createGovernanceBody(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaGovernanceBody>> {
	const parsed = createGovernanceBodyInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid governance body input", {
			issues: parsed.error.issues,
		});
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: CA_COMMAND_GOVERNANCE_BODY_CREATE,
	});
	if (!authorized.ok) return authorized;

	const company = await requireCompany(
		store,
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!company.ok) return company;

	const existing = await store.getGovernanceBodyByIdempotencyKey(
		parsed.data.organizationId,
		parsed.data.idempotencyKey,
	);
	if (!existing.ok) return existing;
	const requestFingerprint = governanceFingerprint(
		CA_COMMAND_GOVERNANCE_BODY_CREATE,
		parsed.data,
	);
	if (existing.data)
		return replayIdempotencyFingerprint(existing.data, requestFingerprint);

	const code = normalizeCompanyCode(parsed.data.code);
	if (!code.ok) return code;

	return store.createGovernanceBody(
		{
			organizationId: parsed.data.organizationId,
			legalCompanyId: parsed.data.legalCompanyId,
			code: code.data.code,
			normalizedCode: code.data.normalizedCode,
			bodyType: parsed.data.bodyType,
			displayName: parsed.data.displayName,
			status: "active",
			createIdempotencyKey: parsed.data.idempotencyKey,
			requestFingerprint,
			retiredAt: null,
			retiredBy: null,
			retirementReason: null,
			createdBy: parsed.data.actorUserId,
			updatedBy: parsed.data.actorUserId,
		},
		ports,
		{
			correlationId: parsed.data.correlationId,
			eventType: CA_GOVERNANCE_BODY_CREATED_EVENT,
		},
	);
}

export async function getGovernanceBody(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaGovernanceBody>> {
	const parsed = getGovernanceBodyInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid governance body get input", {
			issues: parsed.error.issues,
		});
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_GOVERNANCE_BODY_GET,
	});
	if (!authorized.ok) return authorized;
	const row = await store.getGovernanceBodyById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!row.ok) return row;
	if (!row.data || row.data.legalCompanyId !== parsed.data.legalCompanyId) {
		return fail("NOT_FOUND", "Governance body not found");
	}
	return ok(row.data);
}

export async function listGovernanceBodies(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaGovernanceBody[]>> {
	const parsed = listGovernanceBodiesInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid governance body list input", {
			issues: parsed.error.issues,
		});
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_GOVERNANCE_BODY_LIST,
	});
	if (!authorized.ok) return authorized;
	const listed = await store.listGovernanceBodies(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!listed.ok || !parsed.data.asOf) return listed;
	const end = new Date(`${parsed.data.asOf}T23:59:59.999Z`);
	return ok(
		listed.data.filter(
			(row) =>
				row.createdAt <= end && (row.retiredAt === null || end < row.retiredAt),
		),
	);
}

export async function appointGovernanceMembership(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaGovernanceMembership>> {
	const parsed = createGovernanceMembershipInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid governance membership input", {
			issues: parsed.error.issues,
		});
	}
	const { store, ports, masters, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: CA_COMMAND_GOVERNANCE_MEMBERSHIP_APPOINT,
	});
	if (!authorized.ok) return authorized;

	const company = await requireCompany(
		store,
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!company.ok) return company;

	const existing = await store.getGovernanceMembershipByIdempotencyKey(
		parsed.data.organizationId,
		parsed.data.idempotencyKey,
	);
	if (!existing.ok) return existing;
	const requestFingerprint = governanceFingerprint(
		CA_COMMAND_GOVERNANCE_MEMBERSHIP_APPOINT,
		parsed.data,
	);
	if (existing.data)
		return replayIdempotencyFingerprint(existing.data, requestFingerprint);

	let memberPartyCode: string | null = null;
	let memberPartyName: string | null = null;
	if (parsed.data.subject.kind === "party") {
		const party = await resolvePartySnapshot(masters, {
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			partyId: parsed.data.subject.partyId,
		});
		if (!party.ok) return party;
		memberPartyCode = party.data.partyCode;
		memberPartyName = party.data.partyName;
	}

	if (parsed.data.subject.kind === "officer") {
		const officer = await store.getOfficerAppointmentById(
			parsed.data.organizationId,
			parsed.data.subject.officerAppointmentId,
		);
		if (!officer.ok) return officer;
		if (
			!officer.data ||
			officer.data.legalCompanyId !== parsed.data.legalCompanyId
		) {
			return fail("NOT_FOUND", "Officer appointment not found");
		}
	}

	return store.createGovernanceMembership(
		{
			organizationId: parsed.data.organizationId,
			legalCompanyId: parsed.data.legalCompanyId,
			governanceBodyId: parsed.data.governanceBodyId,
			memberPartyId:
				parsed.data.subject.kind === "party"
					? parsed.data.subject.partyId
					: null,
			memberPartyCodeSnapshot: memberPartyCode,
			memberPartyNameSnapshot: memberPartyName,
			officerAppointmentId:
				parsed.data.subject.kind === "officer"
					? parsed.data.subject.officerAppointmentId
					: null,
			roleTitle: parsed.data.roleTitle,
			effectiveFrom: parsed.data.effectiveFrom,
			effectiveTo: null,
			createIdempotencyKey: parsed.data.idempotencyKey,
			requestFingerprint,
			endReason: null,
			createdBy: parsed.data.actorUserId,
			updatedBy: parsed.data.actorUserId,
		},
		ports,
		{
			correlationId: parsed.data.correlationId,
			eventType: CA_GOVERNANCE_MEMBERSHIP_APPOINTED_EVENT,
		},
	);
}

export async function getGovernanceMembership(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaGovernanceMembership>> {
	const parsed = getGovernanceMembershipInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid governance membership get input", {
			issues: parsed.error.issues,
		});
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_GOVERNANCE_MEMBERSHIP_GET,
	});
	if (!authorized.ok) return authorized;
	const row = await store.getGovernanceMembershipById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!row.ok) return row;
	if (!row.data || row.data.legalCompanyId !== parsed.data.legalCompanyId) {
		return fail("NOT_FOUND", "Governance membership not found");
	}
	return ok(row.data);
}

export async function listGovernanceMemberships(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaGovernanceMembership[]>> {
	const parsed = listGovernanceMembershipsInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid governance membership list input", {
			issues: parsed.error.issues,
		});
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_GOVERNANCE_MEMBERSHIP_LIST,
	});
	if (!authorized.ok) return authorized;
	const listed = await store.listGovernanceMemberships(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!listed.ok || !parsed.data.asOf) return listed;
	const asOf = parsed.data.asOf;
	return ok(listed.data.filter((row) => isEffectiveOnDate(row, asOf)));
}

export async function grantAuthorityMandate(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaAuthorityMandateDetail>> {
	const parsed = createAuthorityMandateInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid authority mandate input", {
			issues: parsed.error.issues,
		});
	}
	if (
		(parsed.data.amountLimit === undefined) !==
		(parsed.data.currencyCode === undefined)
	) {
		return fail(
			"BAD_REQUEST",
			"Amount limit and currency code must be supplied together",
		);
	}
	if (
		parsed.data.amountLimit !== undefined &&
		(!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(parsed.data.amountLimit) ||
			Number(parsed.data.amountLimit) <= 0)
	) {
		return fail(
			"BAD_REQUEST",
			"Amount limit must be a canonical positive decimal",
		);
	}
	if (
		(parsed.data.signingRule === "single" &&
			(parsed.data.holders.length !== 1 ||
				parsed.data.minimumSignatories !== 1)) ||
		(parsed.data.signingRule === "joint" &&
			(parsed.data.holders.length < 2 ||
				parsed.data.minimumSignatories < 2 ||
				parsed.data.minimumSignatories > parsed.data.holders.length))
	) {
		return fail(
			"BAD_REQUEST",
			"Mandate holder and signatory rules are invalid",
		);
	}
	const { store, ports, masters, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: CA_COMMAND_AUTHORITY_MANDATE_GRANT,
	});
	if (!authorized.ok) return authorized;

	const company = await requireCompany(
		store,
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!company.ok) return company;

	const existing = await store.getAuthorityMandateByIdempotencyKey(
		parsed.data.organizationId,
		parsed.data.idempotencyKey,
	);
	if (!existing.ok) return existing;
	const requestFingerprint = governanceFingerprint(
		CA_COMMAND_AUTHORITY_MANDATE_GRANT,
		parsed.data,
	);
	if (existing.data) {
		const replayed = replayIdempotencyFingerprint(
			existing.data,
			requestFingerprint,
		);
		if (!replayed.ok) return replayed;
		const detail = await store.getAuthorityMandateById(
			parsed.data.organizationId,
			replayed.data.id,
		);
		if (!detail.ok) return detail;
		return detail.data
			? ok(detail.data)
			: fail("NOT_FOUND", "Authority mandate not found");
	}

	if (parsed.data.currencyCode) {
		const masterPort = await requireMasters(masters);
		if (!masterPort.ok) return masterPort;
		const currency = await masterPort.data.getCurrencyByCode({
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			code: parsed.data.currencyCode,
		});
		if (!currency.ok) return currency;
		if (!currency.data) {
			return fail("CONFLICT", "Currency is required");
		}
	}

	const holders: Array<
		Omit<CaAuthorityMandateHolder, "id" | "authorityMandateId" | "createdAt">
	> = [];
	for (const holder of parsed.data.holders) {
		if (holder.kind === "party") {
			const party = await resolvePartySnapshot(masters, {
				organizationId: parsed.data.organizationId,
				actorUserId: parsed.data.actorUserId,
				partyId: holder.partyId,
			});
			if (!party.ok) return party;
			holders.push({
				organizationId: parsed.data.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				holderKind: "party",
				partyId: holder.partyId,
				partyCodeSnapshot: party.data.partyCode,
				partyNameSnapshot: party.data.partyName,
				officerAppointmentId: null,
				effectiveFrom: parsed.data.effectiveFrom,
				effectiveTo: null,
				createdBy: parsed.data.actorUserId,
			});
			continue;
		}
		const officer = await store.getOfficerAppointmentById(
			parsed.data.organizationId,
			holder.officerAppointmentId,
		);
		if (
			!officer.ok ||
			!officer.data ||
			officer.data.legalCompanyId !== parsed.data.legalCompanyId ||
			officer.data.status !== "active"
		) {
			return officer.ok
				? fail("NOT_FOUND", "Active officer appointment not found")
				: officer;
		}
		holders.push({
			organizationId: parsed.data.organizationId,
			legalCompanyId: parsed.data.legalCompanyId,
			holderKind: "officer",
			partyId: null,
			partyCodeSnapshot: null,
			partyNameSnapshot: null,
			officerAppointmentId: holder.officerAppointmentId,
			effectiveFrom: parsed.data.effectiveFrom,
			effectiveTo: null,
			createdBy: parsed.data.actorUserId,
		});
	}

	return store.createAuthorityMandate(
		{
			organizationId: parsed.data.organizationId,
			legalCompanyId: parsed.data.legalCompanyId,
			mandateType: parsed.data.mandateType,
			scopeDescription: parsed.data.scopeDescription,
			amountLimit: parsed.data.amountLimit ?? null,
			currencyCode: parsed.data.currencyCode ?? null,
			signingRule: parsed.data.signingRule,
			minimumSignatories: parsed.data.minimumSignatories,
			effectiveFrom: parsed.data.effectiveFrom,
			effectiveTo: null,
			grantEvidenceReference: parsed.data.grantEvidenceReference ?? null,
			revocationEvidenceReference: null,
			status: "active",
			createIdempotencyKey: parsed.data.idempotencyKey,
			requestFingerprint,
			supersedesAuthorityMandateId: null,
			amendmentReason: null,
			revocationReason: null,
			createdBy: parsed.data.actorUserId,
			updatedBy: parsed.data.actorUserId,
		},
		holders,
		ports,
		{
			correlationId: parsed.data.correlationId,
			eventType: CA_AUTHORITY_MANDATE_GRANTED_EVENT,
		},
	);
}

export async function getAuthorityMandate(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaAuthorityMandateDetail>> {
	const parsed = getAuthorityMandateInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid authority mandate get input", {
			issues: parsed.error.issues,
		});
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_AUTHORITY_MANDATE_GET,
	});
	if (!authorized.ok) return authorized;
	const row = await store.getAuthorityMandateById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!row.ok) return row;
	if (!row.data || row.data.legalCompanyId !== parsed.data.legalCompanyId) {
		return fail("NOT_FOUND", "Authority mandate not found");
	}
	return ok(row.data);
}

export async function listAuthorityMandates(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaAuthorityMandateDetail[]>> {
	const parsed = listAuthorityMandatesInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid authority mandate list input", {
			issues: parsed.error.issues,
		});
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_AUTHORITY_MANDATE_LIST,
	});
	if (!authorized.ok) return authorized;
	const listed = await store.listAuthorityMandates(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!listed.ok || !parsed.data.asOf) return listed;
	const asOf = parsed.data.asOf;
	return ok(listed.data.filter((row) => isEffectiveOnDate(row, asOf)));
}

export async function registerCompanyPremise(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaCompanyPremise>> {
	const parsed = createCompanyPremiseInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid company premise input", {
			issues: parsed.error.issues,
		});
	}
	const { store, ports, masters, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: CA_COMMAND_PREMISE_REGISTER,
	});
	if (!authorized.ok) return authorized;

	const company = await requireCompany(
		store,
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!company.ok) return company;

	const existing = await store.getCompanyPremiseByIdempotencyKey(
		parsed.data.organizationId,
		parsed.data.idempotencyKey,
	);
	if (!existing.ok) return existing;
	const requestFingerprint = governanceFingerprint(
		CA_COMMAND_PREMISE_REGISTER,
		parsed.data,
	);
	if (existing.data)
		return replayIdempotencyFingerprint(existing.data, requestFingerprint);

	const masterPort = await requireMasters(masters);
	if (!masterPort.ok) return masterPort;
	let address: {
		partyAddressId: string | null;
		line1: string;
		line2: string | null;
		city: string | null;
		region: string | null;
		postalCode: string | null;
		countryCode: string | null;
	};
	if (parsed.data.addressSource.kind === "master") {
		const resolvedAddress = await masterPort.data.getPartyAddressById({
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			partyId: company.data.legalPartyId,
			partyAddressId: parsed.data.addressSource.partyAddressId,
		});
		if (!resolvedAddress.ok) return resolvedAddress;
		if (!resolvedAddress.data)
			return fail("NOT_FOUND", "Party address not found");
		address = {
			partyAddressId: resolvedAddress.data.id,
			line1: resolvedAddress.data.line1,
			line2: resolvedAddress.data.line2,
			city: resolvedAddress.data.city,
			region: resolvedAddress.data.region,
			postalCode: resolvedAddress.data.postalCode,
			countryCode: resolvedAddress.data.countryId,
		};
	} else {
		const countryCode = parsed.data.addressSource.countryCode.toUpperCase();
		const country = await masterPort.data.getCountryByCode({
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			code: countryCode,
		});
		if (!country.ok) return country;
		if (!country.data) {
			return fail("CONFLICT", "Country is required");
		}
		address = {
			partyAddressId: null,
			line1: parsed.data.addressSource.line1,
			line2: parsed.data.addressSource.line2 ?? null,
			city: parsed.data.addressSource.city,
			region: parsed.data.addressSource.region ?? null,
			postalCode: parsed.data.addressSource.postalCode ?? null,
			countryCode,
		};
	}

	return store.createCompanyPremise(
		{
			organizationId: parsed.data.organizationId,
			legalCompanyId: parsed.data.legalCompanyId,
			premiseType: parsed.data.premiseType,
			partyAddressId: address.partyAddressId,
			addressLine1Snapshot: address.line1,
			addressLine2Snapshot: address.line2,
			citySnapshot: address.city,
			regionSnapshot: address.region,
			postalCodeSnapshot: address.postalCode,
			countryCodeSnapshot: address.countryCode,
			isPrimary: parsed.data.isPrimary,
			effectiveFrom: parsed.data.effectiveFrom,
			effectiveTo: null,
			status: "active",
			createIdempotencyKey: parsed.data.idempotencyKey,
			requestFingerprint,
			supersedesCompanyPremiseId: null,
			amendmentReason: null,
			retirementReason: null,
			createdBy: parsed.data.actorUserId,
			updatedBy: parsed.data.actorUserId,
		},
		ports,
		{
			correlationId: parsed.data.correlationId,
			eventType: CA_PREMISE_REGISTERED_EVENT,
		},
	);
}

export async function getCompanyPremise(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaCompanyPremise>> {
	const parsed = getCompanyPremiseInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid company premise get input", {
			issues: parsed.error.issues,
		});
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_PREMISE_GET,
	});
	if (!authorized.ok) return authorized;
	const row = await store.getCompanyPremiseById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!row.ok) return row;
	if (!row.data || row.data.legalCompanyId !== parsed.data.legalCompanyId) {
		return fail("NOT_FOUND", "Company premise not found");
	}
	return ok(row.data);
}

export async function listCompanyPremises(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaCompanyPremise[]>> {
	const parsed = listCompanyPremisesInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid company premise list input", {
			issues: parsed.error.issues,
		});
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_PREMISE_LIST,
	});
	if (!authorized.ok) return authorized;
	const listed = await store.listCompanyPremises(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!listed.ok || !parsed.data.asOf) return listed;
	const asOf = parsed.data.asOf;
	return ok(listed.data.filter((row) => isEffectiveOnDate(row, asOf)));
}

export async function recordGovernanceMeeting(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaGovernanceMeeting>> {
	const parsed = createGovernanceMeetingInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid governance meeting input", {
			issues: parsed.error.issues,
		});
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: CA_COMMAND_GOVERNANCE_MEETING_RECORD,
	});
	if (!authorized.ok) return authorized;

	const company = await requireCompany(
		store,
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!company.ok) return company;

	const existing = await store.getGovernanceMeetingByIdempotencyKey(
		parsed.data.organizationId,
		parsed.data.idempotencyKey,
	);
	if (!existing.ok) return existing;
	const requestFingerprint = governanceFingerprint(
		CA_COMMAND_GOVERNANCE_MEETING_RECORD,
		parsed.data,
	);
	if (existing.data)
		return replayIdempotencyFingerprint(existing.data, requestFingerprint);
	if (parsed.data.mode === "correction") {
		const corrected = await store.getGovernanceMeetingById(
			parsed.data.organizationId,
			parsed.data.correctsGovernanceMeetingId,
		);
		if (
			!corrected.ok ||
			!corrected.data ||
			corrected.data.legalCompanyId !== parsed.data.legalCompanyId ||
			corrected.data.status !== "closed"
		) {
			return corrected.ok
				? fail("CONFLICT", "Correction requires an immutable closed meeting")
				: corrected;
		}
	}

	return store.createGovernanceMeeting(
		{
			organizationId: parsed.data.organizationId,
			legalCompanyId: parsed.data.legalCompanyId,
			governanceBodyId: parsed.data.governanceBodyId,
			meetingAt: new Date(parsed.data.meetingAt),
			quorumResult: parsed.data.quorumResult,
			status: parsed.data.mode === "correction" ? "closed" : parsed.data.status,
			minutesDocumentReference: parsed.data.minutesDocumentReference ?? null,
			createIdempotencyKey: parsed.data.idempotencyKey,
			requestFingerprint,
			correctsGovernanceMeetingId:
				parsed.data.mode === "correction"
					? parsed.data.correctsGovernanceMeetingId
					: null,
			correctionReason:
				parsed.data.mode === "correction" ? parsed.data.correctionReason : null,
			closedAt: parsed.data.mode === "correction" ? new Date() : null,
			closedBy:
				parsed.data.mode === "correction" ? parsed.data.actorUserId : null,
			createdBy: parsed.data.actorUserId,
			updatedBy: parsed.data.actorUserId,
		},
		ports,
		{
			correlationId: parsed.data.correlationId,
			eventType:
				parsed.data.mode === "correction"
					? CA_MEETING_CORRECTED_EVENT
					: CA_MEETING_RECORDED_EVENT,
		},
	);
}

export async function getGovernanceMeeting(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaGovernanceMeeting>> {
	const parsed = getGovernanceMeetingInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid governance meeting get input", {
			issues: parsed.error.issues,
		});
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_GOVERNANCE_MEETING_GET,
	});
	if (!authorized.ok) return authorized;
	const row = await store.getGovernanceMeetingById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!row.ok) return row;
	if (!row.data || row.data.legalCompanyId !== parsed.data.legalCompanyId) {
		return fail("NOT_FOUND", "Governance meeting not found");
	}
	return ok(row.data);
}

export async function listGovernanceMeetings(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaGovernanceMeeting[]>> {
	const parsed = listGovernanceMeetingsInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid governance meeting list input", {
			issues: parsed.error.issues,
		});
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_GOVERNANCE_MEETING_LIST,
	});
	if (!authorized.ok) return authorized;
	const listed = await store.listGovernanceMeetings(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!listed.ok || !parsed.data.asOf) return listed;
	const end = new Date(`${parsed.data.asOf}T23:59:59.999Z`);
	return ok(listed.data.filter((row) => row.meetingAt <= end));
}

export async function recordResolution(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaResolution>> {
	const parsed = createResolutionInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid resolution input", {
			issues: parsed.error.issues,
		});
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: CA_COMMAND_RESOLUTION_RECORD,
	});
	if (!authorized.ok) return authorized;

	const company = await requireCompany(
		store,
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!company.ok) return company;

	const existing = await store.getResolutionByIdempotencyKey(
		parsed.data.organizationId,
		parsed.data.idempotencyKey,
	);
	if (!existing.ok) return existing;
	const requestFingerprint = governanceFingerprint(
		CA_COMMAND_RESOLUTION_RECORD,
		parsed.data,
	);
	if (existing.data)
		return replayIdempotencyFingerprint(existing.data, requestFingerprint);
	if (parsed.data.mode === "superseding") {
		const predecessor = await store.getResolutionById(
			parsed.data.organizationId,
			parsed.data.supersedesResolutionId,
		);
		if (
			!predecessor.ok ||
			!predecessor.data ||
			predecessor.data.legalCompanyId !== parsed.data.legalCompanyId ||
			predecessor.data.status !== "approved"
		) {
			return predecessor.ok
				? fail(
						"CONFLICT",
						"Superseding resolution requires an approved predecessor",
					)
				: predecessor;
		}
	}

	return store.createResolution(
		{
			organizationId: parsed.data.organizationId,
			legalCompanyId: parsed.data.legalCompanyId,
			governanceMeetingId: parsed.data.governanceMeetingId ?? null,
			resolutionNumber: parsed.data.resolutionNumber,
			resolutionYear: parsed.data.resolutionYear,
			title: parsed.data.title,
			description: parsed.data.description ?? null,
			status: "draft",
			approvedDate: null,
			approvalEvidenceReference: null,
			supersedesResolutionId:
				parsed.data.mode === "superseding"
					? parsed.data.supersedesResolutionId
					: null,
			supersededById: null,
			supersededAt: null,
			revokedDate: null,
			revocationReason: null,
			revocationEvidenceReference: null,
			createIdempotencyKey: parsed.data.idempotencyKey,
			requestFingerprint,
			createdBy: parsed.data.actorUserId,
			updatedBy: parsed.data.actorUserId,
		},
		ports,
		{
			correlationId: parsed.data.correlationId,
			eventType: CA_RESOLUTION_RECORDED_EVENT,
		},
	);
}

export async function getResolution(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaResolution>> {
	const parsed = getResolutionInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid resolution get input", {
			issues: parsed.error.issues,
		});
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_RESOLUTION_GET,
	});
	if (!authorized.ok) return authorized;
	const row = await store.getResolutionById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!row.ok) return row;
	if (!row.data || row.data.legalCompanyId !== parsed.data.legalCompanyId) {
		return fail("NOT_FOUND", "Resolution not found");
	}
	return ok(row.data);
}

export async function listResolutions(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaResolution[]>> {
	const parsed = listResolutionsInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid resolution list input", {
			issues: parsed.error.issues,
		});
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_RESOLUTION_LIST,
	});
	if (!authorized.ok) return authorized;
	const listed = await store.listResolutions(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!listed.ok || !parsed.data.asOf) return listed;
	const end = new Date(`${parsed.data.asOf}T23:59:59.999Z`);
	return ok(listed.data.filter((row) => row.createdAt <= end));
}
