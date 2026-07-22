import { fail, type Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
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
import type { DocumentRequirement } from "../types";

export const HUMAN_RESOURCES_AGGREGATE_DOCUMENT_REQUIREMENT =
	"document_requirement" as const;
export type HumanResourcesDocumentRequirementAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_DOCUMENT_REQUIREMENT;

export async function createDocumentRequirement(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<DocumentRequirement>> {
	return runComplianceCommand(input, options, {
		schema: createDocumentRequirementInputSchema,
		invalidMessage: "Invalid document requirement create input",
		command: HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_CREATE,
		execute: async (data, { store, ports }) => {
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
					createdBy: data.actorUserId,
				},
				ports,
				{ correlationId: HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_CREATE },
			);
		},
	});
}

export async function updateDocumentRequirement(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<DocumentRequirement>> {
	return runComplianceCommand(input, options, {
		schema: updateDocumentRequirementInputSchema,
		invalidMessage: "Invalid document requirement update input",
		command: HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_UPDATE,
		execute: (data, { store, ports }) =>
			store.updateDocumentRequirement(
				{
					organizationId: data.organizationId,
					requirementId: data.requirementId,
					name: data.name,
					documentType: data.documentType,
					issuingJurisdiction: data.issuingJurisdiction,
					appliesToNote: data.appliesToNote,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_UPDATE },
			),
	});
}

export async function publishDocumentRequirement(
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
				{ correlationId: HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_PUBLISH },
			),
	});
}

export async function retireDocumentRequirement(
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
				{ correlationId: HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_RETIRE },
			),
	});
}
