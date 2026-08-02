import { errorResult, type Result } from "@afenda/errors";
import type { AttendanceBreakWaiverDecision } from "../../../kernel/contracts";
import type { HumanResourcesCommandOptions } from "../../../kernel/execution/command-options";
import {
	invalidState,
	notFound,
} from "../../../kernel/execution/domain-guards";
import {
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
	humanResourcesErrorDetails,
} from "../../../kernel/execution/error-codes";
import {
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_BREAK_WAIVER_APPROVE,
	HUMAN_RESOURCES_QUERY_ATTENDANCE_BREAK_WAIVER_DECISION_LIST,
} from "../../../kernel/operations/module-ids";
import {
	runTimeCapabilityCommand,
	runTimeCapabilityQuery,
} from "../run-operation";
import {
	approveAttendanceBreakWaiverInputSchema,
	listAttendanceBreakWaiverDecisionsInputSchema,
} from "../schema";

export async function approveAttendanceBreakWaiver(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<AttendanceBreakWaiverDecision>> {
	return await runTimeCapabilityCommand(input, options, {
		schema: approveAttendanceBreakWaiverInputSchema,
		invalidMessage: "Invalid attendance break waiver approval input",
		command: HUMAN_RESOURCES_COMMAND_ATTENDANCE_BREAK_WAIVER_APPROVE,
		storeMethods: [
			"approveAttendanceBreakWaiver",
			"getAttendanceSession",
			"getTimePolicy",
			"resolveTimeApprovalAuthority",
		],
		execute: async (data, { store, ports }) => {
			const session = await store.getAttendanceSession({
				organizationId: data.organizationId,
				sessionId: data.sessionId,
			});
			if (!session.ok) {
				return session;
			}
			if (session.data === null) {
				return notFound("Attendance session not found");
			}
			const { automaticBreak } = session.data.provenance;
			if (automaticBreak === null || !automaticBreak.applied) {
				return invalidState(
					"Attendance session has no applied automatic break deduction",
				);
			}
			const policy = await store.getTimePolicy({
				organizationId: data.organizationId,
				policyId: automaticBreak.policyId,
			});
			if (!policy.ok) {
				return policy;
			}
			if (policy.data === null) {
				return invalidState("Automatic break policy was not found");
			}
			if (!policy.data.approvalSteps.includes(data.authority)) {
				return errorResult.fail("FORBIDDEN", {
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_FORBIDDEN,
					),
				});
			}
			const authority = await store.resolveTimeApprovalAuthority({
				organizationId: data.organizationId,
				actorUserId: data.actorUserId,
				authority: data.authority,
				asOf: new Date().toISOString().slice(0, 10),
			});
			if (!authority.ok) {
				return authority;
			}
			if (authority.data === null) {
				return errorResult.fail("FORBIDDEN", {
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_FORBIDDEN,
					),
				});
			}
			return store.approveAttendanceBreakWaiver(
				{
					organizationId: data.organizationId,
					sessionId: data.sessionId,
					policyId: automaticBreak.policyId,
					authorityAssignmentId: authority.data.id,
					authority: data.authority,
					reason: data.reason,
					evidenceReference: data.evidenceReference,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
					correlationId: data.correlationId,
				},
				ports,
			);
		},
	});
}

export async function listAttendanceBreakWaiverDecisions(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<AttendanceBreakWaiverDecision[]>> {
	return await runTimeCapabilityQuery(input, options, {
		schema: listAttendanceBreakWaiverDecisionsInputSchema,
		invalidMessage: "Invalid attendance break waiver decision list input",
		query: HUMAN_RESOURCES_QUERY_ATTENDANCE_BREAK_WAIVER_DECISION_LIST,
		storeMethods: ["listAttendanceBreakWaiverDecisions"],
		execute: async (data, { store }) =>
			store.listAttendanceBreakWaiverDecisions({
				organizationId: data.organizationId,
				sessionId: data.sessionId,
			}),
	});
}
