import {
	HUMAN_RESOURCES_LEAVE_APPROVED_EVENT,
	HUMAN_RESOURCES_LEAVE_CANCELLED_EVENT,
	HUMAN_RESOURCES_LEAVE_ENTITLEMENT_ADJUSTED_EVENT,
	HUMAN_RESOURCES_LEAVE_REJECTED_EVENT,
	HUMAN_RESOURCES_LEAVE_REQUESTED_EVENT,
} from "@afenda/events/schemas";

import {
	HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_ACCRUE,
	HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_ADJUST,
	HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_CARRY_FORWARD,
	HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_EXPIRE,
	HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_GRANT,
	HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_CREATE,
	HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_PUBLISH,
	HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_SUPERSEDE,
	HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_UPDATE,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_AMEND,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_APPROVE,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_CANCEL_APPROVED,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_CREATE_DRAFT,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_REJECT,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_RETURN,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_SUBMIT,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_WITHDRAW,
	type HumanResourcesLeaveCommandId,
} from "../../operations/module-ids";

import {
	defineAuditOnlyEmission,
	defineDomainEventEmission,
} from "../define-emission";
import type { HumanResourcesMutationEmissionDefinition } from "../types";

export const HUMAN_RESOURCES_LEAVE_EMISSIONS = {
	[HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_CREATE]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_CREATE,
		{
			domain: "leave",
			aggregateType: "leave_policy",
		},
	),
	[HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_UPDATE]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_UPDATE,
		{
			domain: "leave",
			aggregateType: "leave_policy",
		},
	),
	[HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_PUBLISH]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_PUBLISH,
		{
			domain: "leave",
			aggregateType: "leave_policy",
		},
	),
	[HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_SUPERSEDE]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_SUPERSEDE,
		{
			domain: "leave",
			aggregateType: "leave_policy",
		},
	),
	[HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_ARCHIVE]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_ARCHIVE,
		{
			domain: "leave",
			aggregateType: "leave_policy",
		},
	),
	[HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_GRANT]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_GRANT,
		{
			domain: "leave",
			aggregateType: "leave_entitlement",
		},
	),
	[HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_ACCRUE]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_ACCRUE,
		{
			domain: "leave",
			aggregateType: "leave_entitlement",
		},
	),
	[HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_CARRY_FORWARD]:
		defineAuditOnlyEmission(
			HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_CARRY_FORWARD,
			{
				domain: "leave",
				aggregateType: "leave_entitlement",
			},
		),
	[HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_EXPIRE]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_EXPIRE,
		{
			domain: "leave",
			aggregateType: "leave_entitlement",
		},
	),
	[HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_ADJUST]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_ADJUST,
		{
			domain: "leave",
			aggregateType: "leave_entitlement",
			eventTypes: [HUMAN_RESOURCES_LEAVE_ENTITLEMENT_ADJUSTED_EVENT] as const,
		},
	),
	[HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_CREATE_DRAFT]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_CREATE_DRAFT,
		{
			domain: "leave",
			aggregateType: "leave_request",
		},
	),
	[HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_SUBMIT]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_SUBMIT,
		{
			domain: "leave",
			aggregateType: "leave_request",
			eventTypes: [HUMAN_RESOURCES_LEAVE_REQUESTED_EVENT] as const,
		},
	),
	[HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_APPROVE]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_APPROVE,
		{
			domain: "leave",
			aggregateType: "leave_request",
			eventTypes: [HUMAN_RESOURCES_LEAVE_APPROVED_EVENT] as const,
		},
	),
	[HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_REJECT]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_REJECT,
		{
			domain: "leave",
			aggregateType: "leave_request",
			eventTypes: [HUMAN_RESOURCES_LEAVE_REJECTED_EVENT] as const,
		},
	),
	[HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_RETURN]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_RETURN,
		{
			domain: "leave",
			aggregateType: "leave_request",
		},
	),
	[HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_WITHDRAW]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_WITHDRAW,
		{
			domain: "leave",
			aggregateType: "leave_request",
		},
	),
	[HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_CANCEL_APPROVED]:
		defineDomainEventEmission(
			HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_CANCEL_APPROVED,
			{
				domain: "leave",
				aggregateType: "leave_request",
				eventTypes: [HUMAN_RESOURCES_LEAVE_CANCELLED_EVENT] as const,
			},
		),
	[HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_AMEND]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_AMEND,
		{
			domain: "leave",
			aggregateType: "leave_request",
		},
	),
} satisfies Record<
	HumanResourcesLeaveCommandId,
	HumanResourcesMutationEmissionDefinition
>;
