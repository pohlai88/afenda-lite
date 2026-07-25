import { fail, ok, type Result } from "@afenda/errors/result";

import { requireCaQueryPermission } from "./authorization";
import {
	type CorporateAdministrationCommandOptions,
	resolveCommandDeps,
} from "./command-options";
import {
	CA_QUERY_AUTHORITY_MANDATE_GET_AS_OF,
	CA_QUERY_GOVERNANCE_BODY_GET_AS_OF,
	CA_QUERY_GOVERNANCE_MEETING_GET_AS_OF,
	CA_QUERY_GOVERNANCE_MEMBERSHIP_GET_AS_OF,
	CA_QUERY_OFFICER_GET_AS_OF,
	CA_QUERY_PREMISE_GET_AS_OF,
	CA_QUERY_RESOLUTION_GET_AS_OF,
	type CaQueryId,
} from "./module-ids";
import type {
	CaAuthorityMandateDetail,
	CaCompanyPremise,
	CaGovernanceBody,
	CaGovernanceMeeting,
	CaGovernanceMembership,
	CaOfficerAppointment,
	CaResolution,
} from "./schemas";

type AsOfInput = {
	organizationId: string;
	actorUserId: string;
	legalCompanyId: string;
	id: string;
	asOf: string;
};

function parse(input: unknown): Result<AsOfInput> {
	if (
		typeof input !== "object" ||
		input === null ||
		!("organizationId" in input) ||
		!("actorUserId" in input) ||
		!("legalCompanyId" in input) ||
		!("id" in input) ||
		!("asOf" in input) ||
		typeof input.organizationId !== "string" ||
		typeof input.actorUserId !== "string" ||
		typeof input.legalCompanyId !== "string" ||
		typeof input.id !== "string" ||
		typeof input.asOf !== "string" ||
		!/^\d{4}-\d{2}-\d{2}$/.test(input.asOf)
	) {
		return fail("BAD_REQUEST", "Invalid governance as-of query");
	}
	return ok(input as AsOfInput);
}

async function loadAsOf<T extends { legalCompanyId: string }>(
	input: unknown,
	options: CorporateAdministrationCommandOptions,
	query: CaQueryId,
	load: (
		store: ReturnType<typeof resolveCommandDeps>["store"],
		parsed: AsOfInput,
	) => Promise<Result<T | null>>,
	effective: (record: T, asOf: string) => boolean,
): Promise<Result<T>> {
	const parsed = parse(input);
	if (!parsed.ok) return parsed;
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query,
	});
	if (!authorized.ok) return authorized;
	const loaded = await load(store, parsed.data);
	if (!loaded.ok) return loaded;
	if (
		!loaded.data ||
		loaded.data.legalCompanyId !== parsed.data.legalCompanyId ||
		!effective(loaded.data, parsed.data.asOf)
	) {
		return fail("NOT_FOUND", "Governance record not effective as of date");
	}
	return ok(loaded.data);
}

const dateInRange = (from: string, to: string | null, asOf: string) =>
	from <= asOf && (to === null || asOf < to);

const instantEndOfDay = (asOf: string) => new Date(`${asOf}T23:59:59.999Z`);

export function getOfficerAppointmentAsOf(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaOfficerAppointment>> {
	return loadAsOf(
		input,
		options,
		CA_QUERY_OFFICER_GET_AS_OF,
		(store, value) =>
			store.getOfficerAppointmentById(value.organizationId, value.id),
		(record, asOf) =>
			dateInRange(record.appointedDate, record.resignedDate, asOf),
	);
}

export function getGovernanceBodyAsOf(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaGovernanceBody>> {
	return loadAsOf(
		input,
		options,
		CA_QUERY_GOVERNANCE_BODY_GET_AS_OF,
		(store, value) =>
			store.getGovernanceBodyById(value.organizationId, value.id),
		(record, asOf) =>
			record.createdAt <= instantEndOfDay(asOf) &&
			(record.retiredAt === null || instantEndOfDay(asOf) < record.retiredAt),
	);
}

export function getGovernanceMembershipAsOf(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaGovernanceMembership>> {
	return loadAsOf(
		input,
		options,
		CA_QUERY_GOVERNANCE_MEMBERSHIP_GET_AS_OF,
		(store, value) =>
			store.getGovernanceMembershipById(value.organizationId, value.id),
		(record, asOf) =>
			dateInRange(record.effectiveFrom, record.effectiveTo, asOf),
	);
}

export function getAuthorityMandateAsOf(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaAuthorityMandateDetail>> {
	return loadAsOf(
		input,
		options,
		CA_QUERY_AUTHORITY_MANDATE_GET_AS_OF,
		(store, value) =>
			store.getAuthorityMandateById(value.organizationId, value.id),
		(record, asOf) =>
			dateInRange(record.effectiveFrom, record.effectiveTo, asOf),
	);
}

export function getCompanyPremiseAsOf(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaCompanyPremise>> {
	return loadAsOf(
		input,
		options,
		CA_QUERY_PREMISE_GET_AS_OF,
		(store, value) =>
			store.getCompanyPremiseById(value.organizationId, value.id),
		(record, asOf) =>
			dateInRange(record.effectiveFrom, record.effectiveTo, asOf),
	);
}

export function getGovernanceMeetingAsOf(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaGovernanceMeeting>> {
	return loadAsOf(
		input,
		options,
		CA_QUERY_GOVERNANCE_MEETING_GET_AS_OF,
		(store, value) =>
			store.getGovernanceMeetingById(value.organizationId, value.id),
		(record, asOf) => record.meetingAt <= instantEndOfDay(asOf),
	);
}

export function getResolutionAsOf(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaResolution>> {
	return loadAsOf(
		input,
		options,
		CA_QUERY_RESOLUTION_GET_AS_OF,
		(store, value) => store.getResolutionById(value.organizationId, value.id),
		(record, asOf) => record.createdAt <= instantEndOfDay(asOf),
	);
}
