import { errorResult, type Result } from "@afenda/errors";
import type { DocumentRequirement } from "../../kernel/contracts";
import { buildMutationMeta } from "../../kernel/emissions/mutation-meta";
import type { HumanResourcesCommandOptions } from "../../kernel/execution/command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
	humanResourcesErrorDetails,
} from "../../kernel/execution/error-codes";
import {
	HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_CREATE,
	HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_PUBLISH,
	HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_RETIRE,
	HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_UPDATE,
} from "../../kernel/operations/module-ids";
import { runComplianceCapabilityCommand } from "./run-operation";
import {
	createDocumentRequirementInputSchema,
	documentRequirementTransitionInputSchema,
	updateDocumentRequirementInputSchema,
} from "./schema";
import type { DocumentRequirementApplicability } from "./status";
import type { HumanResourcesComplianceCapabilityStore } from "./store";

export const HUMAN_RESOURCES_AGGREGATE_DOCUMENT_REQUIREMENT =
	"document_requirement" as const;
export type HumanResourcesDocumentRequirementAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_DOCUMENT_REQUIREMENT;
type EmployeeSpecificApplicability = Extract<
	DocumentRequirementApplicability,
	{ kind: "employee_ids" }
>;

function validateApplicabilityReferences(
	store: Pick<HumanResourcesComplianceCapabilityStore, "getEmployeeById">,
	input: {
		organizationId: string;
		applicability: DocumentRequirementApplicability;
	},
): Promise<Result<void>> {
	if (input.applicability.kind === "all_employees") {
		return Promise.resolve({ ok: true, data: undefined });
	}
	return validateApplicabilityEmployeeAtIndex(store, {
		organizationId: input.organizationId,
		employeeIds: input.applicability.employeeIds,
		index: 0,
	});
}

async function validateApplicabilityEmployeeAtIndex(
	store: Pick<HumanResourcesComplianceCapabilityStore, "getEmployeeById">,
	input: {
		organizationId: string;
		employeeIds: EmployeeSpecificApplicability["employeeIds"];
		index: number;
	},
): Promise<Result<void>> {
	const employeeId = input.employeeIds[input.index];
	if (employeeId === undefined) {
		return { ok: true, data: undefined };
	}
	const employee = await store.getEmployeeById({
		organizationId: input.organizationId,
		employeeId,
	});
	if (!employee.ok) {
		return employee;
	}
	if (employee.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "The requested resource was not found",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			),
		});
	}
	return validateApplicabilityEmployeeAtIndex(store, {
		...input,
		index: input.index + 1,
	});
}

export function createDocumentRequirement(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<DocumentRequirement>> {
	return runComplianceCapabilityCommand(input, options, {
		schema: createDocumentRequirementInputSchema,
		invalidMessage: "Invalid document requirement create input",
		command: HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_CREATE,
		storeMethods: [
			"getEmployeeById",
			"findDocumentRequirementByCode",
			"createDocumentRequirement",
		],
		execute: async (data, { store, ports }) => {
			const applicability = await validateApplicabilityReferences(store, {
				organizationId: data.organizationId,
				applicability: data.applicability,
			});
			if (!applicability.ok) {
				return applicability;
			}

			const existing = await store.findDocumentRequirementByCode({
				organizationId: data.organizationId,
				code: data.code,
			});
			if (!existing.ok) {
				return existing;
			}
			if (existing.data !== null) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CONFLICT,
					),
				});
			}

			return store.createDocumentRequirement(
				{
					organizationId: data.organizationId,
					code: data.code,
					name: data.name,
					documentType: data.documentType,
					issuingJurisdiction: data.issuingJurisdiction ?? null,
					appliesToNote: data.appliesToNote ?? null,
					applicability: data.applicability,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_CREATE,
				}),
			);
		},
	});
}

export function updateDocumentRequirement(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<DocumentRequirement>> {
	return runComplianceCapabilityCommand(input, options, {
		schema: updateDocumentRequirementInputSchema,
		invalidMessage: "Invalid document requirement update input",
		command: HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_UPDATE,
		storeMethods: ["getEmployeeById", "updateDocumentRequirement"],
		execute: async (data, { store, ports }) => {
			if (data.applicability !== undefined) {
				const applicability = await validateApplicabilityReferences(store, {
					organizationId: data.organizationId,
					applicability: data.applicability,
				});
				if (!applicability.ok) {
					return applicability;
				}
			}
			return store.updateDocumentRequirement(
				{
					organizationId: data.organizationId,
					requirementId: data.requirementId,
					name: data.name,
					documentType: data.documentType,
					issuingJurisdiction: data.issuingJurisdiction,
					appliesToNote: data.appliesToNote,
					applicability: data.applicability,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_UPDATE,
				}),
			);
		},
	});
}

export function publishDocumentRequirement(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<DocumentRequirement>> {
	return runComplianceCapabilityCommand(input, options, {
		schema: documentRequirementTransitionInputSchema,
		invalidMessage: "Invalid document requirement publish input",
		command: HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_PUBLISH,
		storeMethods: ["publishDocumentRequirement"],
		execute: (data, { store, ports }) =>
			store.publishDocumentRequirement(
				{
					organizationId: data.organizationId,
					requirementId: data.requirementId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_PUBLISH,
				}),
			),
	});
}

export function retireDocumentRequirement(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<DocumentRequirement>> {
	return runComplianceCapabilityCommand(input, options, {
		schema: documentRequirementTransitionInputSchema,
		invalidMessage: "Invalid document requirement retire input",
		command: HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_RETIRE,
		storeMethods: ["retireDocumentRequirement"],
		execute: (data, { store, ports }) =>
			store.retireDocumentRequirement(
				{
					organizationId: data.organizationId,
					requirementId: data.requirementId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_RETIRE,
				}),
			),
	});
}
