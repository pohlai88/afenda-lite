import { readFileSync } from "node:fs";

import { z } from "zod";

import { resolveHumanResourcesAuthorizationPolicy } from "../../src/kernel/authorization/registry";
import { HUMAN_RESOURCES_EVENT_CATALOG } from "../../src/kernel/events/catalog";
import { HUMAN_RESOURCES_OPERATION_GOVERNANCE_MANIFEST } from "../../src/kernel/operations/governance-manifest";
import {
	HUMAN_RESOURCES_OPERATION_TEMPORAL_POLICY_OVERRIDES,
	projectHumanResourcesOperationTemporalPolicy,
} from "../../src/kernel/operations/temporal-policy";
import { buildPublicContract } from "./public-contract";

const temporalPolicySchema = z.enum([
	"command-contract",
	"current-state",
	"effective-as-of",
	"legal-work-date",
]);

const privacyDispositionSchema = z
	.discriminatedUnion("mode", [
		z.object({ mode: z.literal("standard") }),
		z.object({
			fieldClasses: z.array(z.string().min(1)),
			mode: z.literal("sensitive"),
			resourceType: z.string().min(1),
			subjectPolicy: z.string().min(1),
		}),
	])
	.nullable();

const registryOperationSchema = z.object({
	auditRequirement: z.enum(["none", "required"]),
	authorizationPolicy: z.string(),
	authorizationPolicyMode: z.string(),
	authorizationResourceRequired: z.boolean(),
	emissionMode: z.enum(["audit_only", "domain_event", "not_applicable"]),
	emissionRequirement: z.enum(["none", "required"]),
	eventTypes: z.array(z.string().min(1)),
	id: z.string().min(1),
	idempotencyRequirement: z.enum(["none", "required"]),
	kind: z.enum(["command", "query"]),
	owner: z.string().min(1),
	permission: z.string(),
	privacyDisposition: privacyDispositionSchema,
	publicErrorCodeSet: z.string().min(1).nullable(),
	publicName: z.string().min(1),
	temporalPolicy: temporalPolicySchema.nullable(),
	transactionRequirement: z.enum(["none", "required"]),
});

const registryProjectionContractSchema = z.object({
	authorizationProjection: z.record(z.string(), z.string()),
	errorCodeSets: z.record(z.string(), z.array(z.string().min(1))),
	eventCatalog: z.array(z.string().min(1)),
	operations: z.array(registryOperationSchema),
	packageName: z.literal("@afenda/human-resources"),
	schemaVersion: z.literal(1),
	temporalPolicyOverrides: z.record(z.string(), temporalPolicySchema),
});

export type RegistryProjectionContract = z.infer<
	typeof registryProjectionContractSchema
>;

export interface RegistryProjectionIssue {
	readonly code:
		| "duplicate-operation"
		| "event-not-catalogued"
		| "invalid-command-disposition"
		| "invalid-query-disposition"
		| "missing-authorization"
		| "missing-privacy-disposition"
		| "missing-public-error-allowance"
		| "missing-temporal-policy"
		| "permission-projection-drift"
		| "temporal-projection-drift"
		| "unknown-authorization-projection"
		| "unknown-temporal-override";
	readonly id: string;
}

function publicErrorCodeSet(
	publicNames: ReadonlyMap<
		string,
		{
			readonly signatures?: readonly { readonly resultErrorCodeSet?: string }[];
		}
	>,
	publicName: string,
): string | null {
	const codeSets = new Set(
		(publicNames.get(publicName)?.signatures ?? [])
			.map((signature) => signature.resultErrorCodeSet)
			.filter((codeSet) => codeSet !== undefined),
	);
	if (codeSets.size > 1) {
		throw new Error(
			`HR operation ${publicName} exposes contradictory public error allowances.`,
		);
	}
	return codeSets.values().next().value ?? null;
}

export function buildRegistryProjectionContract(
	packageRoot: string,
): RegistryProjectionContract {
	const publicContract = buildPublicContract(packageRoot);
	const publicNames = new Map(
		publicContract.entrypoints["."].symbols.map((symbol) => [
			symbol.name,
			symbol,
		]),
	);
	const operations = Object.values(
		HUMAN_RESOURCES_OPERATION_GOVERNANCE_MANIFEST,
	)
		.map((definition) => {
			const authorization = resolveHumanResourcesAuthorizationPolicy(
				definition.id,
			);
			return {
				auditRequirement: definition.execution.audit,
				authorizationPolicy: authorization.id,
				authorizationPolicyMode: authorization.mode,
				authorizationResourceRequired: authorization.resourceRequired,
				emissionMode: definition.emission.emissionMode,
				emissionRequirement: definition.execution.emission,
				eventTypes:
					definition.kind === "command"
						? [...definition.emission.eventTypes].toSorted()
						: [],
				id: definition.id,
				idempotencyRequirement: definition.execution.idempotency,
				kind: definition.kind,
				owner: definition.owner,
				permission: definition.permission,
				privacyDisposition:
					definition.sensitivity === null
						? { mode: "standard" as const }
						: {
								fieldClasses: [
									...definition.sensitivity.fieldClasses,
								].toSorted(),
								mode: "sensitive" as const,
								resourceType: definition.sensitivity.resourceType,
								subjectPolicy: definition.sensitivity.subjectPolicy,
							},
				publicErrorCodeSet: publicErrorCodeSet(
					publicNames,
					definition.publicName,
				),
				publicName: definition.publicName,
				temporalPolicy:
					projectHumanResourcesOperationTemporalPolicy(definition),
				transactionRequirement: definition.execution.transaction,
			};
		})
		.toSorted((left, right) => left.id.localeCompare(right.id));

	return registryProjectionContractSchema.parse({
		authorizationProjection: Object.fromEntries(
			operations.map((operation) => [operation.id, operation.permission]),
		),
		errorCodeSets: publicContract.errorCodeSets,
		eventCatalog: Object.keys(HUMAN_RESOURCES_EVENT_CATALOG).toSorted(),
		operations,
		packageName: publicContract.packageName,
		schemaVersion: 1,
		temporalPolicyOverrides:
			HUMAN_RESOURCES_OPERATION_TEMPORAL_POLICY_OVERRIDES,
	});
}

export function readRegistryProjectionFixture(
	file: string,
): RegistryProjectionContract {
	return registryProjectionContractSchema.parse(
		JSON.parse(readFileSync(file, "utf8")),
	);
}

export function validateRegistryProjectionContract(
	contract: RegistryProjectionContract,
): readonly RegistryProjectionIssue[] {
	const issues: RegistryProjectionIssue[] = [];
	const ids = new Set<string>();
	const eventCatalog = new Set(contract.eventCatalog);
	for (const operation of contract.operations) {
		if (ids.has(operation.id)) {
			issues.push({ code: "duplicate-operation", id: operation.id });
		}
		ids.add(operation.id);
		if (
			operation.permission.length === 0 ||
			operation.authorizationPolicy.length === 0 ||
			operation.authorizationPolicyMode.length === 0
		) {
			issues.push({ code: "missing-authorization", id: operation.id });
		}
		if (
			contract.authorizationProjection[operation.id] !== operation.permission
		) {
			issues.push({ code: "permission-projection-drift", id: operation.id });
		}
		for (const eventType of operation.eventTypes) {
			if (!eventCatalog.has(eventType)) {
				issues.push({ code: "event-not-catalogued", id: operation.id });
			}
		}
		if (operation.temporalPolicy === null) {
			issues.push({ code: "missing-temporal-policy", id: operation.id });
		}
		if (operation.privacyDisposition === null) {
			issues.push({ code: "missing-privacy-disposition", id: operation.id });
		}
		if (operation.publicErrorCodeSet === null) {
			issues.push({ code: "missing-public-error-allowance", id: operation.id });
		}
		if (
			operation.kind === "command" &&
			(operation.transactionRequirement !== "required" ||
				operation.idempotencyRequirement !== "required" ||
				operation.auditRequirement !== "required" ||
				operation.emissionRequirement !== "required" ||
				operation.emissionMode === "not_applicable")
		) {
			issues.push({ code: "invalid-command-disposition", id: operation.id });
		}
		if (
			operation.kind === "query" &&
			(operation.transactionRequirement !== "none" ||
				operation.idempotencyRequirement !== "none" ||
				operation.auditRequirement !== "none" ||
				operation.emissionRequirement !== "none" ||
				operation.emissionMode !== "not_applicable" ||
				operation.eventTypes.length > 0)
		) {
			issues.push({ code: "invalid-query-disposition", id: operation.id });
		}
		const temporalOverride = contract.temporalPolicyOverrides[operation.id];
		if (
			temporalOverride !== undefined &&
			temporalOverride !== operation.temporalPolicy
		) {
			issues.push({ code: "temporal-projection-drift", id: operation.id });
		}
	}
	for (const operationId of Object.keys(contract.authorizationProjection)) {
		if (!ids.has(operationId)) {
			issues.push({
				code: "unknown-authorization-projection",
				id: operationId,
			});
		}
	}
	for (const operationId of Object.keys(contract.temporalPolicyOverrides)) {
		if (!ids.has(operationId)) {
			issues.push({ code: "unknown-temporal-override", id: operationId });
		}
	}
	return issues.toSorted((left, right) =>
		`${left.code}:${left.id}`.localeCompare(`${right.code}:${right.id}`),
	);
}
