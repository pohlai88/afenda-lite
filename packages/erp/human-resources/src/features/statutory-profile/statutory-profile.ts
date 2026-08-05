import { errorResult, type Result } from "@afenda/errors";
import type {
	StatutoryProfile,
	StatutoryProfileListPage,
	StatutoryReliefDeclaration,
} from "../../kernel/contracts";
import { buildMutationMeta } from "../../kernel/emissions/mutation-meta";
import type { HumanResourcesCommandOptions } from "../../kernel/execution/command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../../kernel/execution/error-codes";
import { fingerprintStatutoryProfileUpsert } from "../../kernel/identity/fingerprint";
import {
	HUMAN_RESOURCES_COMMAND_STATUTORY_PROFILE_UPSERT,
	HUMAN_RESOURCES_QUERY_STATUTORY_PROFILE_GET,
	HUMAN_RESOURCES_QUERY_STATUTORY_PROFILE_LIST,
} from "./operation-registry";
import {
	isStatutorySubjectRestricted,
	statutorySubjectRestrictedFailure,
} from "./privacy";
import {
	runStatutoryProfileCapabilityCommand,
	runStatutoryProfileCapabilityQuery,
} from "./run-operation";
import {
	getStatutoryProfileInputSchema,
	listStatutoryProfilesInputSchema,
	upsertStatutoryProfileInputSchema,
} from "./schema";
import { STATUTORY_RELIEF_DECLARATION_VERSION } from "./status";
import type { IdempotentStatutoryProfileRecord } from "./store-contract";

export const HUMAN_RESOURCES_AGGREGATE_STATUTORY_PROFILE =
	"statutory_profile" as const;
export type HumanResourcesStatutoryProfileAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_STATUTORY_PROFILE;

function normalizeReliefDeclarations(
	declarations: readonly {
		reliefCode: string;
		amount?: string | null | undefined;
		currencyCode?: string | null | undefined;
		dependantReference?: string | null | undefined;
		evidenceRef?: string | null | undefined;
	}[],
): StatutoryReliefDeclaration[] {
	return declarations.map((declaration) => ({
		reliefCode: declaration.reliefCode,
		amount: declaration.amount ?? null,
		currencyCode: declaration.currencyCode ?? null,
		dependantReference: declaration.dependantReference ?? null,
		evidenceRef: declaration.evidenceRef ?? null,
	})) as StatutoryReliefDeclaration[];
}

/**
 * Returns the replay outcome when the idempotency key was already used, or
 * `null` when the caller should proceed with a fresh capture.
 */
function resolveIdempotentReplay(
	lookup: Result<IdempotentStatutoryProfileRecord | null>,
	requestFingerprint: string,
): Result<StatutoryProfile> | null {
	if (!lookup.ok) {
		return lookup;
	}
	if (lookup.data === null) {
		return null;
	}
	if (lookup.data.createRequestFingerprint !== requestFingerprint) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "The request conflicts with current state",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			),
		});
	}
	return errorResult.ok(lookup.data.profile);
}

/**
 * D0 capture — supersedes the open profile segment and opens a new one from
 * `effectiveFrom`. Idempotent on `idempotencyKey` with fingerprint equality.
 */
export function upsertStatutoryProfile(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<StatutoryProfile>> {
	return runStatutoryProfileCapabilityCommand(input, options, {
		schema: upsertStatutoryProfileInputSchema,
		invalidMessage: "Invalid statutory profile upsert input",
		command: HUMAN_RESOURCES_COMMAND_STATUTORY_PROFILE_UPSERT,
		storeMethods: [
			"getEmployeeById",
			"findStatutoryProfileByIdempotencyKey",
			"upsertStatutoryProfile",
		],
		execute: async (data, { store, ports }) => {
			const reliefDeclarations = normalizeReliefDeclarations(
				data.reliefDeclarations,
			);
			const requestFingerprint = fingerprintStatutoryProfileUpsert({
				employeeId: data.employeeId,
				jurisdictionCode: data.jurisdictionCode,
				effectiveFrom: data.effectiveFrom,
				taxResidencyStatus: data.taxResidencyStatus,
				nationalityCountryCode: data.nationalityCountryCode,
				expatriate: data.expatriate,
				minimumWageZone: data.minimumWageZone ?? null,
				dependantCount: data.dependantCount,
				reliefDeclarationVersion: STATUTORY_RELIEF_DECLARATION_VERSION,
				reliefDeclarations,
				taxFileNumber: data.taxFileNumber ?? null,
				employeeProvidentFundNumber: data.employeeProvidentFundNumber ?? null,
				socialSecurityNumber: data.socialSecurityNumber ?? null,
				socialInsuranceBookNumber: data.socialInsuranceBookNumber ?? null,
			});

			const existingByKey = await store.findStatutoryProfileByIdempotencyKey({
				organizationId: data.organizationId,
				idempotencyKey: data.idempotencyKey,
			});
			const replay = resolveIdempotentReplay(existingByKey, requestFingerprint);
			if (replay !== null) {
				return replay;
			}

			const employee = await store.getEmployeeById({
				organizationId: data.organizationId,
				employeeId: data.employeeId,
			});
			if (!employee.ok) {
				return employee;
			}
			if (employee.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
			}

			return store.upsertStatutoryProfile(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
					jurisdictionCode: data.jurisdictionCode,
					taxResidencyStatus: data.taxResidencyStatus,
					nationalityCountryCode: data.nationalityCountryCode,
					expatriate: data.expatriate,
					minimumWageZone: data.minimumWageZone ?? null,
					taxFileNumber: data.taxFileNumber ?? null,
					employeeProvidentFundNumber: data.employeeProvidentFundNumber ?? null,
					socialSecurityNumber: data.socialSecurityNumber ?? null,
					socialInsuranceBookNumber: data.socialInsuranceBookNumber ?? null,
					dependantCount: data.dependantCount,
					reliefDeclarationVersion: STATUTORY_RELIEF_DECLARATION_VERSION,
					reliefDeclarations,
					effectiveFrom: data.effectiveFrom,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: requestFingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_STATUTORY_PROFILE_UPSERT,
				}),
			);
		},
	});
}

/** As-of resolution over the effective-dated segments; `asOf` defaults to today. */
export function getStatutoryProfile(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<StatutoryProfile | null>> {
	return runStatutoryProfileCapabilityQuery(input, options, {
		schema: getStatutoryProfileInputSchema,
		invalidMessage: "Invalid statutory profile get input",
		query: HUMAN_RESOURCES_QUERY_STATUTORY_PROFILE_GET,
		storeMethods: ["getStatutoryProfileAsOf"],
		execute: async (data, { store, options: resolvedOptions }) => {
			const restricted = await isStatutorySubjectRestricted(
				{
					organizationId: data.organizationId,
					actorUserId: data.actorUserId,
					correlationId: data.correlationId,
					employeeId: data.employeeId,
				},
				resolvedOptions,
			);
			if (!restricted.ok) {
				return restricted;
			}
			if (restricted.data) {
				return statutorySubjectRestrictedFailure();
			}
			return store.getStatutoryProfileAsOf({
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				asOf: data.asOf ?? new Date().toISOString().slice(0, 10),
			});
		},
	});
}

/** Restricted subjects are withheld from the page and counted separately. */
export function listStatutoryProfiles(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<StatutoryProfileListPage>> {
	return runStatutoryProfileCapabilityQuery(input, options, {
		schema: listStatutoryProfilesInputSchema,
		invalidMessage: "Invalid statutory profile list input",
		query: HUMAN_RESOURCES_QUERY_STATUTORY_PROFILE_LIST,
		storeMethods: ["listStatutoryProfiles"],
		execute: async (data, { store, options: resolvedOptions }) => {
			const page = await store.listStatutoryProfiles({
				organizationId: data.organizationId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
				employeeId: data.employeeId,
				jurisdictionCode: data.jurisdictionCode,
				statutoryProfileId: data.statutoryProfileId,
			});
			if (!page.ok) {
				return page;
			}

			const subjects = [
				...new Set(page.data.profiles.map((profile) => profile.employeeId)),
			];
			const evaluations = await Promise.all(
				subjects.map((employeeId) =>
					isStatutorySubjectRestricted(
						{
							organizationId: data.organizationId,
							actorUserId: data.actorUserId,
							correlationId: data.correlationId,
							employeeId,
						},
						resolvedOptions,
					),
				),
			);
			const restrictionBySubject = new Map<string, boolean>();
			for (const [index, evaluation] of evaluations.entries()) {
				if (!evaluation.ok) {
					return evaluation;
				}
				const subject = subjects[index];
				if (subject !== undefined) {
					restrictionBySubject.set(subject, evaluation.data);
				}
			}
			const disclosed = page.data.profiles.filter(
				(profile) => restrictionBySubject.get(profile.employeeId) !== true,
			);

			return errorResult.ok({
				...page.data,
				profiles: disclosed,
				restrictedExcluded: page.data.profiles.length - disclosed.length,
			});
		},
	});
}
