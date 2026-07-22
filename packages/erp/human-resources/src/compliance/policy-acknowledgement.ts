import { fail, ok, type Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_ACKNOWLEDGE,
	HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_ISSUE,
	HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_REVOKE,
	HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_SUPERSEDE,
} from "../module-ids";
import {
	acknowledgePolicyInputSchema,
	getPolicyAcknowledgementStatusInputSchema,
	issuePolicyAcknowledgementRequirementInputSchema,
	listOutstandingPolicyAcknowledgementsInputSchema,
	revokePolicyAcknowledgementInputSchema,
	supersedePolicyAcknowledgementRequirementInputSchema,
} from "../schemas/compliance";
import {
	runComplianceCommand,
	runComplianceEmployeeScopedQuery,
} from "../shared/compliance-command";
import { fingerprintPolicyAcknowledgementIssue } from "../shared/fingerprint";
import type {
	PolicyAcknowledgement,
	PolicyAcknowledgementListPage,
} from "../types";

export const HUMAN_RESOURCES_AGGREGATE_POLICY_ACKNOWLEDGEMENT =
	"policy_acknowledgement" as const;
export type HumanResourcesPolicyAcknowledgementAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_POLICY_ACKNOWLEDGEMENT;

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;

export async function issuePolicyAcknowledgementRequirement(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PolicyAcknowledgement>> {
	return runComplianceCommand(input, options, {
		schema: issuePolicyAcknowledgementRequirementInputSchema,
		invalidMessage: "Invalid policy acknowledgement issue input",
		command: HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_ISSUE,
		execute: async (data, { store, ports }) => {
			const requestFingerprint = fingerprintPolicyAcknowledgementIssue({
				employeeId: data.employeeId,
				policyCode: data.policyCode,
				policyVersion: data.policyVersion,
			});

			const existingByKey =
				await store.findPolicyAcknowledgementByIdempotencyKey({
					organizationId: data.organizationId,
					idempotencyKey: data.idempotencyKey,
				});
			if (!existingByKey.ok) {
				return existingByKey;
			}
			if (existingByKey.data !== null) {
				if (
					existingByKey.data.createRequestFingerprint !== requestFingerprint
				) {
					return fail(
						"CONFLICT",
						"Idempotency key reused with different payload",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
					);
				}
				return ok(existingByKey.data.acknowledgement);
			}

			return store.issuePolicyAcknowledgementRequirement(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
					policyCode: data.policyCode,
					policyVersion: data.policyVersion,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: requestFingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				{ correlationId: HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_ISSUE },
			);
		},
	});
}

export async function acknowledgePolicy(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PolicyAcknowledgement>> {
	return runComplianceCommand(input, options, {
		schema: acknowledgePolicyInputSchema,
		invalidMessage: "Invalid policy acknowledgement input",
		command: HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_ACKNOWLEDGE,
		execute: (data, { store, ports }) =>
			store.acknowledgePolicy(
				{
					organizationId: data.organizationId,
					acknowledgementId: data.acknowledgementId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{
					correlationId:
						HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_ACKNOWLEDGE,
				},
			),
	});
}

export async function revokePolicyAcknowledgement(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PolicyAcknowledgement>> {
	return runComplianceCommand(input, options, {
		schema: revokePolicyAcknowledgementInputSchema,
		invalidMessage: "Invalid policy acknowledgement revoke input",
		command: HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_REVOKE,
		execute: (data, { store, ports }) =>
			store.revokePolicyAcknowledgement(
				{
					organizationId: data.organizationId,
					acknowledgementId: data.acknowledgementId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{
					correlationId: HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_REVOKE,
				},
			),
	});
}

export async function supersedePolicyAcknowledgementRequirement(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PolicyAcknowledgement>> {
	return runComplianceCommand(input, options, {
		schema: supersedePolicyAcknowledgementRequirementInputSchema,
		invalidMessage: "Invalid policy acknowledgement supersede input",
		command: HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_SUPERSEDE,
		execute: (data, { store, ports }) =>
			store.supersedePolicyAcknowledgementRequirement(
				{
					organizationId: data.organizationId,
					acknowledgementId: data.acknowledgementId,
					newPolicyVersion: data.newPolicyVersion,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{
					correlationId:
						HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_SUPERSEDE,
				},
			),
	});
}

export async function getPolicyAcknowledgementStatus(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PolicyAcknowledgement | null>> {
	return runComplianceEmployeeScopedQuery(input, options, {
		schema: getPolicyAcknowledgementStatusInputSchema,
		invalidMessage: "Invalid policy acknowledgement status get input",
		execute: async (data, { store }) => {
			return store.getPolicyAcknowledgementStatus({
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				policyCode: data.policyCode,
				policyVersion: data.policyVersion,
			});
		},
	});
}

export async function listOutstandingPolicyAcknowledgements(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PolicyAcknowledgementListPage>> {
	return runComplianceEmployeeScopedQuery(input, options, {
		schema: listOutstandingPolicyAcknowledgementsInputSchema,
		invalidMessage: "Invalid outstanding policy acknowledgements list input",
		execute: async (data, { store }) => {
			return store.listOutstandingPolicyAcknowledgements({
				organizationId: data.organizationId,
				page: data.page ?? DEFAULT_PAGE,
				pageSize: data.pageSize ?? DEFAULT_PAGE_SIZE,
				employeeId: data.employeeId,
			});
		},
	});
}
