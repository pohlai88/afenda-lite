import { fail, type Result } from "@afenda/errors/result";
import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_CREATE,
	HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_PUBLISH,
	HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_RETIRE,
	HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_UPDATE,
} from "../module-ids";
import {
	createDocumentRequirementInputSchema,
	documentRequirementTransitionInputSchema,
	updateDocumentRequirementInputSchema,
} from "../schemas/compliance";
import { runComplianceCommand } from "../shared/compliance-command";
import type { DocumentRequirementApplicability } from "../shared/compliance-status";
import { buildMutationMeta } from "../shared/mutation-meta";
import type { HumanResourcesStore } from "../store";
import type { DocumentRequirement } from "../types";

export const HUMAN_RESOURCES_AGGREGATE_DOCUMENT_REQUIREMENT =
	"document_requirement" as const;
export type HumanResourcesDocumentRequirementAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_DOCUMENT_REQUIREMENT;
type EmployeeSpecificApplicability = Extract<
	DocumentRequirementApplicability,
	{ kind: "employee_ids" }
>;

function validateApplicabilityReferences(
	store: Pick<HumanResourcesStore, "getEmployeeById">,
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
	store: Pick<HumanResourcesStore, "getEmployeeById">,
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
		return fail(
			"NOT_FOUND",
			"Applicability employee not found",
			humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			),
		);
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
	return runComplianceCommand(input, options, {
		schema: createDocumentRequirementInputSchema,
		invalidMessage: "Invalid document requirement create input",
		command: HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_CREATE,
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
				return fail(
					"CONFLICT",
					"Document requirement code already exists",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
				);
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
	return runComplianceCommand(input, options, {
		schema: updateDocumentRequirementInputSchema,
		invalidMessage: "Invalid document requirement update input",
		command: HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_UPDATE,
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
	return runComplianceCommand(input, options, {
		schema: documentRequirementTransitionInputSchema,
		invalidMessage: "Invalid document requirement publish input",
		command: HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_PUBLISH,
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
	return runComplianceCommand(input, options, {
		schema: documentRequirementTransitionInputSchema,
		invalidMessage: "Invalid document requirement retire input",
		command: HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_RETIRE,
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
