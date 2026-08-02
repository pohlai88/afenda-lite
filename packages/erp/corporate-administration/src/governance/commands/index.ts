// biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: Governance commands coordinate policy, CAS, idempotency, audit, and outbox atomically.
import { errorResult, type Result } from "@afenda/errors";
import type { CorporateAdministrationCommandOptions } from "../../command-options";
import {
	authorizeCorporateAdministrationCommand,
	type CorporateAdministrationAuthorizedCommandExecution,
	type CorporateAdministrationCommandKernelDependencies,
	executeCorporateAdministrationCommand,
} from "../../internal/durable-command";
import type { GovernanceMembershipId } from "../../kernel/brands";
import { parseCorporateAdministrationInput } from "../../parse-input";
import {
	assertNoGovernanceMembershipConflict,
	normalizeGovernanceBodyCode,
	validateMembershipWithinBody,
} from "../rules";
import {
	amendGovernanceBodyInputSchema,
	appointGovernanceMemberInputSchema,
	changeGovernanceMembershipInputSchema,
	createGovernanceBodyInputSchema,
	endGovernanceMembershipInputSchema,
	governanceBodySchema,
	governanceMembershipSchema,
	retireGovernanceBodyInputSchema,
} from "../schemas";
import type { GovernanceCommandDependencies } from "../store";
import type {
	AmendGovernanceBodyInput,
	AppointGovernanceMemberInput,
	ChangeGovernanceMembershipInput,
	CreateGovernanceBodyInput,
	EndGovernanceMembershipInput,
	GovernanceBody,
	GovernanceMembership,
	RetireGovernanceBodyInput,
} from "../types";

type Dependencies = GovernanceCommandDependencies &
	CorporateAdministrationCommandKernelDependencies;

export async function createGovernanceBody(
	input: CreateGovernanceBodyInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
): Promise<Result<GovernanceBody>> {
	const parsed = parseCorporateAdministrationInput(
		createGovernanceBodyInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const authorized = await authorizeCorporateAdministrationCommand(
		"createGovernanceBody",
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
	const source = await validateSource(
		dependencies,
		options.organizationId,
		parsed.data.sourceDocumentId,
	);
	if (!source.ok) {
		return source;
	}

	return executeCorporateAdministrationCommand({
		authorization: authorized.data,
		fingerprintSchema: createGovernanceBodyInputSchema,
		fingerprintInput: parsed.data,
		outputSchema: governanceBodySchema,
		dependencies,
		event: {
			operationType: "CREATE",
			targetType: "ca_governance_body",
			aggregateId: (result) => result.id,
			aggregateVersion: (result) => result.version,
			payload: (result, context) => ({
				organizationId: context.organizationId,
				legalCompanyId: result.legalCompanyId,
				governanceBodyId: result.id,
				bodyType: result.bodyType,
				effectiveFrom: result.effectiveFrom,
				occurredAt: context.occurredAt,
				actorUserId: context.actorUserId,
				correlationId: context.correlationId,
			}),
			safeMetadata: { body_type: parsed.data.bodyType },
		},
		serializeResult: serializeGovernanceBody,
		work: (transaction, context) =>
			dependencies.governanceStore.createGovernanceBody({
				organizationId: options.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				bodyType: parsed.data.bodyType,
				bodyCode: parsed.data.bodyCode,
				normalizedBodyCode: normalizeGovernanceBodyCode(parsed.data.bodyCode),
				displayName: parsed.data.displayName,
				description: parsed.data.description ?? null,
				effectiveFrom: parsed.data.effectiveFrom,
				recordedAt: context.occurredAt,
				recordedBy: options.actorUserId,
				sourceDocumentId: parsed.data.sourceDocumentId,
				expectedCompanyVersion: parsed.data.expectedCompanyVersion,
				transaction,
			}),
	});
}

export async function amendGovernanceBody(
	input: AmendGovernanceBodyInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
): Promise<Result<GovernanceBody>> {
	const parsed = parseCorporateAdministrationInput(
		amendGovernanceBodyInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const authorized = await authorizeCorporateAdministrationCommand(
		"amendGovernanceBody",
		options,
	);
	if (!authorized.ok) {
		return authorized;
	}
	const current = await dependencies.governanceStore.getGovernanceBody({
		organizationId: options.organizationId,
		governanceBodyId: parsed.data.governanceBodyId,
	});
	if (!current.ok) {
		return current;
	}
	if (current.data === null) {
		return notFound("governanceBody");
	}
	if (current.data.version !== parsed.data.expectedVersion) {
		return stale(parsed.data.expectedVersion, current.data.version);
	}
	const source = await validateSource(
		dependencies,
		options.organizationId,
		parsed.data.sourceDocumentId,
	);
	if (!source.ok) {
		return source;
	}
	return runGovernanceBodyUpdate({
		authorization: authorized.data,
		operationId: "amendGovernanceBody",
		inputSchema: amendGovernanceBodyInputSchema,
		input: parsed.data,
		options,
		dependencies,
		work: (transaction, context) =>
			dependencies.governanceStore.amendGovernanceBody({
				organizationId: options.organizationId,
				governanceBodyId: parsed.data.governanceBodyId,
				displayName: parsed.data.displayName,
				description: parsed.data.description ?? null,
				recordedAt: context.occurredAt,
				recordedBy: options.actorUserId,
				sourceDocumentId: parsed.data.sourceDocumentId,
				expectedVersion: parsed.data.expectedVersion,
				transaction,
			}),
	});
}

export async function retireGovernanceBody(
	input: RetireGovernanceBodyInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
): Promise<Result<GovernanceBody>> {
	const parsed = parseCorporateAdministrationInput(
		retireGovernanceBodyInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const authorized = await authorizeCorporateAdministrationCommand(
		"retireGovernanceBody",
		options,
	);
	if (!authorized.ok) {
		return authorized;
	}
	const current = await dependencies.governanceStore.getGovernanceBody({
		organizationId: options.organizationId,
		governanceBodyId: parsed.data.governanceBodyId,
	});
	if (!current.ok) {
		return current;
	}
	if (current.data === null) {
		return notFound("governanceBody");
	}
	if (current.data.version !== parsed.data.expectedVersion) {
		return stale(parsed.data.expectedVersion, current.data.version);
	}
	if (parsed.data.retiredOn <= current.data.effectiveFrom) {
		return invalidChronology("retiredOn");
	}
	const memberships =
		await dependencies.governanceStore.listGovernanceMembershipsAsOf({
			organizationId: options.organizationId,
			governanceBodyId: current.data.id,
			asOf: parsed.data.retiredOn,
		});
	if (!memberships.ok) {
		return memberships;
	}
	if (memberships.data.length > 0) {
		return conflict("activeMemberships");
	}
	const source = await validateSource(
		dependencies,
		options.organizationId,
		parsed.data.sourceDocumentId,
	);
	if (!source.ok) {
		return source;
	}
	return runGovernanceBodyUpdate({
		authorization: authorized.data,
		operationId: "retireGovernanceBody",
		inputSchema: retireGovernanceBodyInputSchema,
		input: parsed.data,
		options,
		dependencies,
		work: (transaction, context) =>
			dependencies.governanceStore.retireGovernanceBody({
				organizationId: options.organizationId,
				governanceBodyId: parsed.data.governanceBodyId,
				retiredOn: parsed.data.retiredOn,
				reason: parsed.data.reason,
				recordedAt: context.occurredAt,
				recordedBy: options.actorUserId,
				sourceDocumentId: parsed.data.sourceDocumentId,
				expectedVersion: parsed.data.expectedVersion,
				transaction,
			}),
	});
}

export async function appointGovernanceMember(
	input: AppointGovernanceMemberInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
): Promise<Result<GovernanceMembership>> {
	const parsed = parseCorporateAdministrationInput(
		appointGovernanceMemberInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const authorized = await authorizeCorporateAdministrationCommand(
		"appointGovernanceMember",
		options,
	);
	if (!authorized.ok) {
		return authorized;
	}
	const body = await dependencies.governanceStore.getGovernanceBody({
		organizationId: options.organizationId,
		governanceBodyId: parsed.data.governanceBodyId,
	});
	if (!body.ok) {
		return body;
	}
	if (body.data === null) {
		return notFound("governanceBody");
	}
	const governanceBody = body.data;
	if (governanceBody.version !== parsed.data.expectedBodyVersion) {
		return stale(parsed.data.expectedBodyVersion, governanceBody.version);
	}
	if (governanceBody.status !== "active") {
		return conflict("governanceBodyId");
	}
	const term = { from: parsed.data.termFrom, to: parsed.data.termTo ?? null };
	const withinBody = validateMembershipWithinBody({
		body: governanceBody,
		term,
	});
	if (!withinBody.ok) {
		return withinBody;
	}
	const source = await validateSource(
		dependencies,
		options.organizationId,
		parsed.data.sourceDocumentId,
	);
	if (!source.ok) {
		return source;
	}
	if (parsed.data.memberKind === "party") {
		const party = await dependencies.partyReferences.getOrganizationParty({
			organizationId: options.organizationId,
			partyId: parsed.data.memberPartyId,
		});
		if (!party.ok) {
			return party;
		}
		if (party.data === null || !party.data.active) {
			return invalidReference("memberPartyId", party.data !== null);
		}
	}
	const existing = await dependencies.governanceStore.listGovernanceMemberships(
		{
			organizationId: options.organizationId,
			governanceBodyId: governanceBody.id,
		},
	);
	if (!existing.ok) {
		return existing;
	}
	const conflictCheck = assertNoGovernanceMembershipConflict({
		candidate: {
			id: "" as GovernanceMembershipId,
			memberKind: parsed.data.memberKind,
			memberPartyId:
				parsed.data.memberKind === "party" ? parsed.data.memberPartyId : null,
			roleSeatCode:
				parsed.data.memberKind === "role_seat"
					? parsed.data.roleSeatCode
					: null,
			isChair: parsed.data.isChair ?? false,
			termFrom: parsed.data.termFrom,
			termTo: parsed.data.termTo ?? null,
		},
		existing: existing.data,
	});
	if (!conflictCheck.ok) {
		return conflictCheck;
	}
	return runGovernanceMembershipUpdate({
		authorization: authorized.data,
		operationId: "appointGovernanceMember",
		operationType: "CREATE",
		inputSchema: appointGovernanceMemberInputSchema,
		input: parsed.data,
		options,
		dependencies,
		work: (transaction, context) =>
			dependencies.governanceStore.appointGovernanceMember({
				organizationId: options.organizationId,
				legalCompanyId: governanceBody.legalCompanyId,
				governanceBodyId: governanceBody.id,
				memberKind: parsed.data.memberKind,
				memberPartyId:
					parsed.data.memberKind === "party" ? parsed.data.memberPartyId : null,
				roleSeatCode:
					parsed.data.memberKind === "role_seat"
						? parsed.data.roleSeatCode
						: null,
				seatLabel: parsed.data.seatLabel,
				membershipRole: parsed.data.membershipRole,
				votingEntitlement: parsed.data.votingEntitlement,
				isChair: parsed.data.isChair ?? false,
				termFrom: parsed.data.termFrom,
				termTo: parsed.data.termTo ?? null,
				recordedAt: context.occurredAt,
				recordedBy: options.actorUserId,
				sourceDocumentId: parsed.data.sourceDocumentId,
				expectedBodyVersion: parsed.data.expectedBodyVersion,
				transaction,
			}),
	});
}

export async function changeGovernanceMembership(
	input: ChangeGovernanceMembershipInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
): Promise<Result<GovernanceMembership>> {
	const parsed = parseCorporateAdministrationInput(
		changeGovernanceMembershipInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const authorized = await authorizeCorporateAdministrationCommand(
		"changeGovernanceMembership",
		options,
	);
	if (!authorized.ok) {
		return authorized;
	}
	const current = await dependencies.governanceStore.getGovernanceMembership({
		organizationId: options.organizationId,
		governanceMembershipId: parsed.data.governanceMembershipId,
	});
	if (!current.ok) {
		return current;
	}
	if (current.data === null) {
		return notFound("governanceMembership");
	}
	if (current.data.version !== parsed.data.expectedVersion) {
		return stale(parsed.data.expectedVersion, current.data.version);
	}
	const body = await dependencies.governanceStore.getGovernanceBody({
		organizationId: options.organizationId,
		governanceBodyId: current.data.governanceBodyId,
	});
	if (!body.ok) {
		return body;
	}
	if (body.data === null) {
		return notFound("governanceBody");
	}
	const withinBody = validateMembershipWithinBody({
		body: body.data,
		term: { from: parsed.data.termFrom, to: parsed.data.termTo ?? null },
	});
	if (!withinBody.ok) {
		return withinBody;
	}
	const existing = await dependencies.governanceStore.listGovernanceMemberships(
		{
			organizationId: options.organizationId,
			governanceBodyId: current.data.governanceBodyId,
		},
	);
	if (!existing.ok) {
		return existing;
	}
	const conflictCheck = assertNoGovernanceMembershipConflict({
		candidate: {
			...current.data,
			isChair: parsed.data.isChair,
			termFrom: parsed.data.termFrom,
			termTo: parsed.data.termTo ?? null,
		},
		existing: existing.data,
	});
	if (!conflictCheck.ok) {
		return conflictCheck;
	}
	const source = await validateSource(
		dependencies,
		options.organizationId,
		parsed.data.sourceDocumentId,
	);
	if (!source.ok) {
		return source;
	}
	return runGovernanceMembershipUpdate({
		authorization: authorized.data,
		operationId: "changeGovernanceMembership",
		operationType: "UPDATE",
		inputSchema: changeGovernanceMembershipInputSchema,
		input: parsed.data,
		options,
		dependencies,
		work: (transaction, context) =>
			dependencies.governanceStore.changeGovernanceMembership({
				organizationId: options.organizationId,
				governanceMembershipId: parsed.data.governanceMembershipId,
				seatLabel: parsed.data.seatLabel,
				membershipRole: parsed.data.membershipRole,
				votingEntitlement: parsed.data.votingEntitlement,
				isChair: parsed.data.isChair,
				termFrom: parsed.data.termFrom,
				termTo: parsed.data.termTo ?? null,
				recordedAt: context.occurredAt,
				recordedBy: options.actorUserId,
				sourceDocumentId: parsed.data.sourceDocumentId,
				expectedVersion: parsed.data.expectedVersion,
				transaction,
			}),
	});
}

export async function endGovernanceMembership(
	input: EndGovernanceMembershipInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
): Promise<Result<GovernanceMembership>> {
	const parsed = parseCorporateAdministrationInput(
		endGovernanceMembershipInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const authorized = await authorizeCorporateAdministrationCommand(
		"endGovernanceMembership",
		options,
	);
	if (!authorized.ok) {
		return authorized;
	}
	const current = await dependencies.governanceStore.getGovernanceMembership({
		organizationId: options.organizationId,
		governanceMembershipId: parsed.data.governanceMembershipId,
	});
	if (!current.ok) {
		return current;
	}
	if (current.data === null) {
		return notFound("governanceMembership");
	}
	if (current.data.version !== parsed.data.expectedVersion) {
		return stale(parsed.data.expectedVersion, current.data.version);
	}
	if (parsed.data.endedOn <= current.data.termFrom) {
		return invalidChronology("endedOn");
	}
	const source = await validateSource(
		dependencies,
		options.organizationId,
		parsed.data.sourceDocumentId,
	);
	if (!source.ok) {
		return source;
	}
	return runGovernanceMembershipUpdate({
		authorization: authorized.data,
		operationId: "endGovernanceMembership",
		operationType: "UPDATE",
		inputSchema: endGovernanceMembershipInputSchema,
		input: parsed.data,
		options,
		dependencies,
		work: (transaction, context) =>
			dependencies.governanceStore.endGovernanceMembership({
				organizationId: options.organizationId,
				governanceMembershipId: parsed.data.governanceMembershipId,
				endedOn: parsed.data.endedOn,
				reason: parsed.data.reason,
				recordedAt: context.occurredAt,
				recordedBy: options.actorUserId,
				sourceDocumentId: parsed.data.sourceDocumentId,
				expectedVersion: parsed.data.expectedVersion,
				transaction,
			}),
	});
}

function runGovernanceBodyUpdate(input: {
	authorization: CorporateAdministrationAuthorizedCommandExecution;
	operationId: "amendGovernanceBody" | "retireGovernanceBody";
	inputSchema:
		| typeof amendGovernanceBodyInputSchema
		| typeof retireGovernanceBodyInputSchema;
	input: unknown;
	options: CorporateAdministrationCommandOptions;
	dependencies: Dependencies;
	work: Parameters<
		typeof executeCorporateAdministrationCommand<GovernanceBody>
	>[0]["work"];
}) {
	return executeCorporateAdministrationCommand({
		authorization: input.authorization,
		fingerprintSchema: input.inputSchema,
		fingerprintInput: input.input,
		outputSchema: governanceBodySchema,
		dependencies: input.dependencies,
		event: {
			operationType: "UPDATE",
			targetType: "ca_governance_body",
			aggregateId: (result) => result.id,
			aggregateVersion: (result) => result.version,
			payload: (result, context) => ({
				organizationId: context.organizationId,
				legalCompanyId: result.legalCompanyId,
				governanceBodyId: result.id,
				status: result.status,
				occurredAt: context.occurredAt,
				actorUserId: context.actorUserId,
				correlationId: context.correlationId,
			}),
		},
		serializeResult: serializeGovernanceBody,
		work: input.work,
	});
}

function runGovernanceMembershipUpdate(input: {
	authorization: CorporateAdministrationAuthorizedCommandExecution;
	operationId:
		| "appointGovernanceMember"
		| "changeGovernanceMembership"
		| "endGovernanceMembership";
	operationType: "CREATE" | "UPDATE";
	inputSchema:
		| typeof appointGovernanceMemberInputSchema
		| typeof changeGovernanceMembershipInputSchema
		| typeof endGovernanceMembershipInputSchema;
	input: unknown;
	options: CorporateAdministrationCommandOptions;
	dependencies: Dependencies;
	work: Parameters<
		typeof executeCorporateAdministrationCommand<GovernanceMembership>
	>[0]["work"];
}) {
	return executeCorporateAdministrationCommand({
		authorization: input.authorization,
		fingerprintSchema: input.inputSchema,
		fingerprintInput: input.input,
		outputSchema: governanceMembershipSchema,
		dependencies: input.dependencies,
		event: {
			operationType: input.operationType,
			targetType: "ca_governance_membership",
			aggregateId: (result) => result.id,
			aggregateVersion: (result) => result.version,
			payload: (result, context) => ({
				organizationId: context.organizationId,
				legalCompanyId: result.legalCompanyId,
				governanceBodyId: result.governanceBodyId,
				governanceMembershipId: result.id,
				status: result.status,
				occurredAt: context.occurredAt,
				actorUserId: context.actorUserId,
				correlationId: context.correlationId,
			}),
		},
		serializeResult: serializeGovernanceMembership,
		work: input.work,
	});
}

async function validateSource(
	dependencies: Dependencies,
	organizationId: CorporateAdministrationCommandOptions["organizationId"],
	sourceDocumentId: string,
) {
	const source = await dependencies.referenceData.validateSourceDocument({
		organizationId,
		sourceDocumentId,
	});
	if (!source.ok) {
		return source;
	}
	return source.data === null || !source.data.active
		? invalidReference("sourceDocumentId", source.data !== null)
		: { ok: true as const, data: undefined };
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
		publicMessage: "Corporate Administration governance conflict.",
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

function serializeGovernanceBody(result: GovernanceBody) {
	return {
		...result,
		recordedAt: result.recordedAt.toISOString(),
		createdAt: result.createdAt.toISOString(),
		updatedAt: result.updatedAt.toISOString(),
	};
}

function serializeGovernanceMembership(result: GovernanceMembership) {
	return {
		...result,
		recordedAt: result.recordedAt.toISOString(),
		createdAt: result.createdAt.toISOString(),
		updatedAt: result.updatedAt.toISOString(),
	};
}
