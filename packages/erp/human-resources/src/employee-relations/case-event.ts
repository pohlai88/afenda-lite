import type { Result } from "@afenda/errors/result";

import {
	type HumanResourcesCommandOptions,
	requireDocumentReference,
} from "../command-options";
import {
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_ADD_EVIDENCE_REFERENCE,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_RECORD_EVENT,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_REDACT_EVIDENCE_REFERENCE,
} from "../module-ids";
import {
	addEmployeeCaseEvidenceReferenceInputSchema,
	recordEmployeeCaseEventInputSchema,
	redactEmployeeCaseEvidenceReferenceInputSchema,
} from "../schemas/employee-relations";
import { runEmployeeRelationsCommand } from "../shared/employee-relations-command";
import { buildMutationMeta } from "../shared/mutation-meta";
import type { EmployeeCaseEvent } from "./types";

export const HUMAN_RESOURCES_AGGREGATE_EMPLOYEE_CASE_EVENT =
	"employee_case_event" as const;
export type HumanResourcesEmployeeCaseEventAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_EMPLOYEE_CASE_EVENT;

export async function recordEmployeeCaseEvent(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeCaseEvent>> {
	return runEmployeeRelationsCommand(input, options, {
		schema: recordEmployeeCaseEventInputSchema,
		invalidMessage: "Invalid employee case event input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_RECORD_EVENT,
		execute: (data, { store, ports }) =>
			store.recordEmployeeCaseEvent(
				{
					organizationId: data.organizationId,
					caseId: data.caseId,
					eventKind: data.eventKind,
					payloadJson: data.payloadJson ?? null,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operation: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_RECORD_EVENT,
				}),
			),
	});
}

export async function addEmployeeCaseEvidenceReference(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeCaseEvent>> {
	const documentReference = requireDocumentReference(options);
	if (!documentReference.ok) {
		return documentReference;
	}

	return runEmployeeRelationsCommand(input, options, {
		schema: addEmployeeCaseEvidenceReferenceInputSchema,
		invalidMessage: "Invalid employee case evidence reference input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_ADD_EVIDENCE_REFERENCE,
		execute: async (data, { store, ports }) => {
			const refCheck = await documentReference.data.validateReference({
				organizationId: data.organizationId,
				reference: data.documentRef,
				allowedKinds: ["case_evidence", "employee_document", "other"],
				requireImmutableVersion: true,
			});
			if (!refCheck.ok) {
				return refCheck;
			}

			return store.addEmployeeCaseEvidenceReference(
				{
					organizationId: data.organizationId,
					caseId: data.caseId,
					documentRef: refCheck.data.reference,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operation:
						HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_ADD_EVIDENCE_REFERENCE,
				}),
			);
		},
	});
}

export async function redactEmployeeCaseEvidenceReference(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeCaseEvent>> {
	return runEmployeeRelationsCommand(input, options, {
		schema: redactEmployeeCaseEvidenceReferenceInputSchema,
		invalidMessage: "Invalid employee case evidence redact input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_REDACT_EVIDENCE_REFERENCE,
		execute: (data, { store, ports }) =>
			store.redactEmployeeCaseEvidenceReference(
				{
					organizationId: data.organizationId,
					caseId: data.caseId,
					eventId: data.eventId,
					reasonCode: data.reasonCode,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operation:
						HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_REDACT_EVIDENCE_REFERENCE,
				}),
			),
	});
}
