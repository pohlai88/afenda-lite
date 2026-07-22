import type { Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_ADD_EVIDENCE_REFERENCE,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_RECORD_EVENT,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_REDACT_EVIDENCE_REFERENCE,
} from "../module-ids";
import { runEmployeeRelationsCommand } from "../shared/employee-relations-command";
import {
	addEmployeeCaseEvidenceReferenceInputSchema,
	recordEmployeeCaseEventInputSchema,
	redactEmployeeCaseEvidenceReferenceInputSchema,
} from "./schemas";
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
				{ correlationId: data.correlationId },
			),
	});
}

export async function addEmployeeCaseEvidenceReference(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeCaseEvent>> {
	return runEmployeeRelationsCommand(input, options, {
		schema: addEmployeeCaseEvidenceReferenceInputSchema,
		invalidMessage: "Invalid employee case evidence reference input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_ADD_EVIDENCE_REFERENCE,
		execute: (data, { store, ports }) =>
			store.addEmployeeCaseEvidenceReference(
				{
					organizationId: data.organizationId,
					caseId: data.caseId,
					documentRef: data.documentRef,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
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
				{ correlationId: data.correlationId },
			),
	});
}
