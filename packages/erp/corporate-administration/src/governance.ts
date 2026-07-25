import { fail, ok, type Result } from "@afenda/errors/result";

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
	type CaAuthorityMandate,
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

async function requireCompany(
	store: CorporateAdministrationCommandOptions["store"],
	organizationId: string,
	legalCompanyId: string,
): Promise<Result<{ id: string }>> {
	const resolved = resolveCommandDeps({ store });
	const company = await resolved.store.getById(organizationId, legalCompanyId);
	if (!company.ok) return company;
	if (!company.data) return fail("NOT_FOUND", "Legal company not found");
	return ok({ id: company.data.id });
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
	const { store, masters, authorization } = resolveCommandDeps(options);
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
	if (existing.data) return ok(existing.data);

	const party = await resolvePartySnapshot(masters, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		partyId: parsed.data.partyId,
	});
	if (!party.ok) return party;

	return store.createOfficerAppointment({
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
		createdBy: parsed.data.actorUserId,
		updatedBy: parsed.data.actorUserId,
	});
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
	const { store, authorization } = resolveCommandDeps(options);
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
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_OFFICER_LIST,
	});
	if (!authorized.ok) return authorized;
	return store.listOfficerAppointments(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
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
	const { store, authorization } = resolveCommandDeps(options);
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
	if (existing.data) return ok(existing.data);

	const code = normalizeCompanyCode(parsed.data.code);
	if (!code.ok) return code;

	return store.createGovernanceBody({
		organizationId: parsed.data.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		code: code.data.code,
		normalizedCode: code.data.normalizedCode,
		bodyType: parsed.data.bodyType,
		displayName: parsed.data.displayName,
		status: "active",
		createIdempotencyKey: parsed.data.idempotencyKey,
		createdBy: parsed.data.actorUserId,
		updatedBy: parsed.data.actorUserId,
	});
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
	const { store, authorization } = resolveCommandDeps(options);
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
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_GOVERNANCE_BODY_LIST,
	});
	if (!authorized.ok) return authorized;
	return store.listGovernanceBodies(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
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
	if (!parsed.data.memberPartyId && !parsed.data.officerAppointmentId) {
		return fail(
			"BAD_REQUEST",
			"Member party or officer appointment is required",
		);
	}
	const { store, masters, authorization } = resolveCommandDeps(options);
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
	if (existing.data) return ok(existing.data);

	let memberPartyCode: string | null = null;
	let memberPartyName: string | null = null;
	if (parsed.data.memberPartyId) {
		const party = await resolvePartySnapshot(masters, {
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			partyId: parsed.data.memberPartyId,
		});
		if (!party.ok) return party;
		memberPartyCode = party.data.partyCode;
		memberPartyName = party.data.partyName;
	}

	if (parsed.data.officerAppointmentId) {
		const officer = await store.getOfficerAppointmentById(
			parsed.data.organizationId,
			parsed.data.officerAppointmentId,
		);
		if (!officer.ok) return officer;
		if (
			!officer.data ||
			officer.data.legalCompanyId !== parsed.data.legalCompanyId
		) {
			return fail("NOT_FOUND", "Officer appointment not found");
		}
	}

	return store.createGovernanceMembership({
		organizationId: parsed.data.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		governanceBodyId: parsed.data.governanceBodyId,
		memberPartyId: parsed.data.memberPartyId ?? null,
		memberPartyCodeSnapshot: memberPartyCode,
		memberPartyNameSnapshot: memberPartyName,
		officerAppointmentId: parsed.data.officerAppointmentId ?? null,
		roleTitle: parsed.data.roleTitle,
		effectiveFrom: parsed.data.effectiveFrom,
		effectiveTo: null,
		createIdempotencyKey: parsed.data.idempotencyKey,
		createdBy: parsed.data.actorUserId,
		updatedBy: parsed.data.actorUserId,
	});
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
	const { store, authorization } = resolveCommandDeps(options);
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
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_GOVERNANCE_MEMBERSHIP_LIST,
	});
	if (!authorized.ok) return authorized;
	return store.listGovernanceMemberships(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
}

export async function grantAuthorityMandate(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaAuthorityMandate>> {
	const parsed = createAuthorityMandateInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid authority mandate input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
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
	if (existing.data) return ok(existing.data);

	return store.createAuthorityMandate({
		organizationId: parsed.data.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		mandateType: parsed.data.mandateType,
		scopeDescription: parsed.data.scopeDescription,
		amountLimit: parsed.data.amountLimit ?? null,
		currencyCode: parsed.data.currencyCode ?? null,
		signingRule: parsed.data.signingRule,
		effectiveFrom: parsed.data.effectiveFrom,
		effectiveTo: null,
		grantEvidenceReference: parsed.data.grantEvidenceReference ?? null,
		revocationEvidenceReference: null,
		status: "active",
		createIdempotencyKey: parsed.data.idempotencyKey,
		createdBy: parsed.data.actorUserId,
		updatedBy: parsed.data.actorUserId,
	});
}

export async function getAuthorityMandate(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaAuthorityMandate>> {
	const parsed = getAuthorityMandateInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid authority mandate get input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
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
): Promise<Result<CaAuthorityMandate[]>> {
	const parsed = listAuthorityMandatesInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid authority mandate list input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_AUTHORITY_MANDATE_LIST,
	});
	if (!authorized.ok) return authorized;
	return store.listAuthorityMandates(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
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
	const { store, authorization } = resolveCommandDeps(options);
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
	if (existing.data) return ok(existing.data);

	return store.createCompanyPremise({
		organizationId: parsed.data.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		premiseType: parsed.data.premiseType,
		partyAddressId: parsed.data.partyAddressId ?? null,
		addressLine1Snapshot: parsed.data.addressLine1Snapshot,
		addressLine2Snapshot: parsed.data.addressLine2Snapshot ?? null,
		citySnapshot: parsed.data.citySnapshot ?? null,
		regionSnapshot: parsed.data.regionSnapshot ?? null,
		postalCodeSnapshot: parsed.data.postalCodeSnapshot ?? null,
		countryCodeSnapshot: parsed.data.countryCodeSnapshot ?? null,
		isPrimary: parsed.data.isPrimary,
		effectiveFrom: parsed.data.effectiveFrom,
		effectiveTo: null,
		status: "active",
		createIdempotencyKey: parsed.data.idempotencyKey,
		createdBy: parsed.data.actorUserId,
		updatedBy: parsed.data.actorUserId,
	});
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
	const { store, authorization } = resolveCommandDeps(options);
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
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_PREMISE_LIST,
	});
	if (!authorized.ok) return authorized;
	return store.listCompanyPremises(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
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
	const { store, authorization } = resolveCommandDeps(options);
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
	if (existing.data) return ok(existing.data);

	return store.createGovernanceMeeting({
		organizationId: parsed.data.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		governanceBodyId: parsed.data.governanceBodyId,
		meetingAt: new Date(parsed.data.meetingAt),
		quorumResult: parsed.data.quorumResult,
		status: parsed.data.status,
		minutesDocumentReference: parsed.data.minutesDocumentReference ?? null,
		createIdempotencyKey: parsed.data.idempotencyKey,
		createdBy: parsed.data.actorUserId,
		updatedBy: parsed.data.actorUserId,
	});
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
	const { store, authorization } = resolveCommandDeps(options);
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
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_GOVERNANCE_MEETING_LIST,
	});
	if (!authorized.ok) return authorized;
	return store.listGovernanceMeetings(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
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
	const { store, authorization } = resolveCommandDeps(options);
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
	if (existing.data) return ok(existing.data);

	return store.createResolution({
		organizationId: parsed.data.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		governanceMeetingId: parsed.data.governanceMeetingId ?? null,
		resolutionNumber: parsed.data.resolutionNumber,
		resolutionYear: parsed.data.resolutionYear,
		title: parsed.data.title,
		description: parsed.data.description ?? null,
		status: parsed.data.status,
		approvedDate: parsed.data.approvedDate ?? null,
		supersededById: null,
		createIdempotencyKey: parsed.data.idempotencyKey,
		createdBy: parsed.data.actorUserId,
		updatedBy: parsed.data.actorUserId,
	});
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
	const { store, authorization } = resolveCommandDeps(options);
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
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_RESOLUTION_LIST,
	});
	if (!authorized.ok) return authorized;
	return store.listResolutions(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
}
