import { errorResult, type Result } from "@afenda/errors";
import type {
	CorporateAdministrationApprovalCommandOptions,
	CorporateAdministrationCommandOptions,
} from "../../../kernel/execution/command-options";
import {
	authorizeCorporateAdministrationCommand,
	type CorporateAdministrationAuthorizedCommandExecution,
	type CorporateAdministrationCommandKernelDependencies,
	executeCorporateAdministrationCommand,
} from "../../../kernel/internal/durable-command";
import { parseCorporateAdministrationInput } from "../../../kernel/validation/parse-input";
import {
	amendAuthorityMandateInputSchema,
	authorityMandateSchema,
	grantAuthorityMandateInputSchema,
	revokeAuthorityMandateInputSchema,
} from "../schemas";
import type { AuthorityCommandDependencies } from "../store";
import type {
	AmendAuthorityMandateInput,
	AuthorityMandate,
	GrantAuthorityMandateInput,
	RevokeAuthorityMandateInput,
} from "../types";

type Dependencies = AuthorityCommandDependencies &
	CorporateAdministrationCommandKernelDependencies;

type AuthorityApprovalOptions = CorporateAdministrationCommandOptions &
	Partial<
		Pick<
			CorporateAdministrationApprovalCommandOptions,
			"approvalDecisionId" | "approvalRequestId"
		>
	>;

export async function grantAuthorityMandate(
	input: GrantAuthorityMandateInput,
	options: AuthorityApprovalOptions,
	dependencies: Dependencies,
): Promise<Result<AuthorityMandate>> {
	const parsed = parseCorporateAdministrationInput(
		grantAuthorityMandateInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const authorized = await authorizeCorporateAdministrationCommand(
		"grantAuthorityMandate",
		options,
	);
	if (!authorized.ok) {
		return authorized;
	}
	const company = await dependencies.companyStore.lockLegalCompany({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		expectedVersion: parsed.data.expectedCompanyVersion,
	});
	if (!company.ok) {
		return company;
	}
	if (company.data === null) {
		return notFound("legalCompany");
	}
	if (company.data.version !== parsed.data.expectedCompanyVersion) {
		return stale(parsed.data.expectedCompanyVersion, company.data.version);
	}
	const holder = await validateMandateHolder(
		dependencies,
		options.organizationId,
		{
			holderPartyId: parsed.data.holderPartyId ?? null,
			holderOfficerAppointmentId:
				parsed.data.holderOfficerAppointmentId ?? null,
		},
	);
	if (!holder.ok) {
		return holder;
	}
	const source = await validateSource(
		dependencies,
		options.organizationId,
		parsed.data.sourceDocumentId,
	);
	if (!source.ok) {
		return source;
	}

	return runAuthorityMandateUpdate({
		authorization: authorized.data,
		operationId: "grantAuthorityMandate",
		operationType: "CREATE",
		inputSchema: grantAuthorityMandateInputSchema,
		input: parsed.data,
		options,
		dependencies,
		approvalRequirement:
			parsed.data.protectedAuthority === true ? "required" : "not_required",
		safeMetadata: { mandate_type: parsed.data.mandateType },
		work: (transaction, context) =>
			dependencies.authorityStore.grantAuthorityMandate({
				organizationId: options.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				mandateType: parsed.data.mandateType,
				holderPartyId: parsed.data.holderPartyId ?? null,
				holderOfficerAppointmentId:
					parsed.data.holderOfficerAppointmentId ?? null,
				grantedByType: parsed.data.grantedByType,
				grantingResolutionId: parsed.data.grantingResolutionId ?? null,
				scopeDescription: parsed.data.scopeDescription,
				monetaryLimitAmount: parsed.data.monetaryLimitAmount ?? null,
				monetaryLimitCurrencyCode:
					parsed.data.monetaryLimitCurrencyCode ?? null,
				jurisdictionCode: parsed.data.jurisdictionCode ?? null,
				protectedAuthority: parsed.data.protectedAuthority ?? false,
				effectiveFrom: parsed.data.effectiveFrom,
				effectiveTo: parsed.data.effectiveTo ?? null,
				recordedAt: context.occurredAt,
				recordedBy: options.actorUserId,
				sourceDocumentId: parsed.data.sourceDocumentId,
				expectedCompanyVersion: parsed.data.expectedCompanyVersion,
				transaction,
			}),
	});
}

export async function amendAuthorityMandate(
	input: AmendAuthorityMandateInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
): Promise<Result<AuthorityMandate>> {
	const parsed = parseCorporateAdministrationInput(
		amendAuthorityMandateInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const authorized = await authorizeCorporateAdministrationCommand(
		"amendAuthorityMandate",
		options,
	);
	if (!authorized.ok) {
		return authorized;
	}
	const current = await loadMandate(
		options,
		dependencies,
		parsed.data.authorityMandateId,
	);
	if (!current.ok) {
		return current;
	}
	if (current.data.version !== parsed.data.expectedVersion) {
		return stale(parsed.data.expectedVersion, current.data.version);
	}
	const effectiveTo = parsed.data.effectiveTo ?? null;
	if (effectiveTo !== null && effectiveTo <= current.data.effectiveFrom) {
		return invalidChronology("effectiveTo");
	}
	const source = await validateSource(
		dependencies,
		options.organizationId,
		parsed.data.sourceDocumentId,
	);
	if (!source.ok) {
		return source;
	}
	return runAuthorityMandateUpdate({
		authorization: authorized.data,
		operationId: "amendAuthorityMandate",
		operationType: "UPDATE",
		inputSchema: amendAuthorityMandateInputSchema,
		input: parsed.data,
		options,
		dependencies,
		work: (transaction, context) =>
			dependencies.authorityStore.amendAuthorityMandate({
				organizationId: options.organizationId,
				authorityMandateId: parsed.data.authorityMandateId,
				scopeDescription: parsed.data.scopeDescription,
				monetaryLimitAmount: parsed.data.monetaryLimitAmount ?? null,
				monetaryLimitCurrencyCode:
					parsed.data.monetaryLimitCurrencyCode ?? null,
				jurisdictionCode: parsed.data.jurisdictionCode ?? null,
				effectiveTo,
				recordedAt: context.occurredAt,
				recordedBy: options.actorUserId,
				sourceDocumentId: parsed.data.sourceDocumentId,
				expectedVersion: parsed.data.expectedVersion,
				transaction,
			}),
	});
}

export async function revokeAuthorityMandate(
	input: RevokeAuthorityMandateInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
): Promise<Result<AuthorityMandate>> {
	const parsed = parseCorporateAdministrationInput(
		revokeAuthorityMandateInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const authorized = await authorizeCorporateAdministrationCommand(
		"revokeAuthorityMandate",
		options,
	);
	if (!authorized.ok) {
		return authorized;
	}
	const current = await loadMandate(
		options,
		dependencies,
		parsed.data.authorityMandateId,
	);
	if (!current.ok) {
		return current;
	}
	if (current.data.version !== parsed.data.expectedVersion) {
		return stale(parsed.data.expectedVersion, current.data.version);
	}
	if (current.data.status !== "active") {
		return conflict("status");
	}
	if (parsed.data.revokedOn <= current.data.effectiveFrom) {
		return invalidChronology("revokedOn");
	}
	const source = await validateSource(
		dependencies,
		options.organizationId,
		parsed.data.sourceDocumentId,
	);
	if (!source.ok) {
		return source;
	}
	return runAuthorityMandateUpdate({
		authorization: authorized.data,
		operationId: "revokeAuthorityMandate",
		operationType: "UPDATE",
		inputSchema: revokeAuthorityMandateInputSchema,
		input: parsed.data,
		options,
		dependencies,
		work: (transaction, context) =>
			dependencies.authorityStore.revokeAuthorityMandate({
				organizationId: options.organizationId,
				authorityMandateId: parsed.data.authorityMandateId,
				revokedOn: parsed.data.revokedOn,
				reason: parsed.data.reason,
				recordedAt: context.occurredAt,
				recordedBy: options.actorUserId,
				sourceDocumentId: parsed.data.sourceDocumentId,
				expectedVersion: parsed.data.expectedVersion,
				transaction,
			}),
	});
}

function runAuthorityMandateUpdate(input: {
	authorization: CorporateAdministrationAuthorizedCommandExecution;
	operationId:
		| "grantAuthorityMandate"
		| "amendAuthorityMandate"
		| "revokeAuthorityMandate";
	operationType: "CREATE" | "UPDATE";
	inputSchema:
		| typeof grantAuthorityMandateInputSchema
		| typeof amendAuthorityMandateInputSchema
		| typeof revokeAuthorityMandateInputSchema;
	input: unknown;
	options: CorporateAdministrationCommandOptions;
	dependencies: Dependencies;
	approvalRequirement?: "required" | "not_required" | undefined;
	safeMetadata?: Readonly<Record<string, string | number | boolean | null>>;
	work: Parameters<
		typeof executeCorporateAdministrationCommand<AuthorityMandate>
	>[0]["work"];
}) {
	return executeCorporateAdministrationCommand({
		authorization: input.authorization,
		fingerprintSchema: input.inputSchema,
		fingerprintInput: input.input,
		outputSchema: authorityMandateSchema,
		dependencies: input.dependencies,
		approvalRequirement: input.approvalRequirement,
		event: {
			operationType: input.operationType,
			targetType: "ca_authority_mandate",
			aggregateId: (result) => result.id,
			aggregateVersion: (result) => result.version,
			payload: (result, context) => ({
				organizationId: context.organizationId,
				legalCompanyId: result.legalCompanyId,
				authorityMandateId: result.id,
				mandateType: result.mandateType,
				status: result.status,
				occurredAt: context.occurredAt,
				actorUserId: context.actorUserId,
				correlationId: context.correlationId,
			}),
			...(input.safeMetadata === undefined
				? {}
				: { safeMetadata: input.safeMetadata }),
		},
		serializeResult: serializeAuthorityMandate,
		work: input.work,
	});
}

async function loadMandate(
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
	authorityMandateId: AuthorityMandate["id"],
): Promise<Result<AuthorityMandate>> {
	const mandate = await dependencies.authorityStore.getAuthorityMandate({
		organizationId: options.organizationId,
		authorityMandateId,
	});
	if (!mandate.ok) {
		return mandate;
	}
	return mandate.data === null
		? notFound("authorityMandate")
		: { ok: true, data: mandate.data };
}

async function validateMandateHolder(
	dependencies: Dependencies,
	organizationId: CorporateAdministrationCommandOptions["organizationId"],
	input: Readonly<{
		holderPartyId: string | null;
		holderOfficerAppointmentId:
			| AuthorityMandate["holderOfficerAppointmentId"]
			| null;
	}>,
): Promise<Result<void>> {
	if (input.holderPartyId !== null) {
		const party = await dependencies.partyReferences.getOrganizationParty({
			organizationId,
			partyId: input.holderPartyId,
		});
		if (!party.ok) {
			return party;
		}
		if (party.data === null || !party.data.active) {
			return invalidReference("holderPartyId", party.data !== null);
		}
		return errorResult.ok(undefined);
	}
	if (input.holderOfficerAppointmentId === null) {
		return invalidReference("holderOfficerAppointmentId", false);
	}
	const appointment =
		await dependencies.officerAppointments.getOfficerAppointmentReference({
			organizationId,
			officerAppointmentId: input.holderOfficerAppointmentId,
		});
	if (!appointment.ok) {
		return appointment;
	}
	if (appointment.data === null || appointment.data.status !== "active") {
		return invalidReference(
			"holderOfficerAppointmentId",
			appointment.data !== null,
		);
	}
	return errorResult.ok(undefined);
}

async function validateSource(
	dependencies: Dependencies,
	organizationId: CorporateAdministrationCommandOptions["organizationId"],
	sourceDocumentId: string,
): Promise<Result<void>> {
	const source = await dependencies.referenceData.validateSourceDocument({
		organizationId,
		sourceDocumentId,
	});
	if (!source.ok) {
		return source;
	}
	return source.data === null || !source.data.active
		? invalidReference("sourceDocumentId", source.data !== null)
		: { ok: true, data: undefined };
}

function notFound(_entityType: string): Result<never> {
	return errorResult.fail("NOT_FOUND", {
		publicMessage: "Corporate Administration record was not found.",
	});
}

function stale(
	_expectedVersion: number,
	_actualVersion: number,
): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage: "Corporate Administration record version is stale.",
	});
}

function conflict(_field: string): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage: "Corporate Administration authority mandate conflict.",
	});
}

function invalidChronology(_field: string): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage: "Corporate Administration chronology is invalid.",
	});
}

function invalidReference(_field: string, inactive: boolean): Result<never> {
	return inactive
		? errorResult.fail("CONFLICT", {
				publicMessage: "Corporate Administration reference is unavailable.",
			})
		: errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Corporate Administration reference is unavailable.",
			});
}

function serializeAuthorityMandate(result: AuthorityMandate) {
	return {
		...result,
		recordedAt: result.recordedAt.toISOString(),
		createdAt: result.createdAt.toISOString(),
		updatedAt: result.updatedAt.toISOString(),
	};
}
