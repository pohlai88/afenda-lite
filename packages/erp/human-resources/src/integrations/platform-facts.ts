import { fail, ok, type Result } from "@afenda/errors/result";
import {
	type DomainEvent,
	HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_TRANSFERRED_EVENT,
	HUMAN_RESOURCES_EMPLOYMENT_STARTED_EVENT,
	HUMAN_RESOURCES_EVENT_IDS,
	HUMAN_RESOURCES_LEARNING_ASSIGNMENT_CREATED_EVENT,
	HUMAN_RESOURCES_LEAVE_APPROVED_EVENT,
	HUMAN_RESOURCES_LEAVE_REJECTED_EVENT,
	HUMAN_RESOURCES_OFFBOARDING_COMPLETED_EVENT,
	HUMAN_RESOURCES_OFFBOARDING_STARTED_EVENT,
	HUMAN_RESOURCES_ONBOARDING_COMPLETED_EVENT,
	HUMAN_RESOURCES_ONBOARDING_STARTED_EVENT,
	type HumanResourcesEventType,
	humanResourcesEntityPayloadSchema,
} from "@afenda/events";

const HUMAN_RESOURCES_EVENT_TYPE_SET = new Set<string>(
	HUMAN_RESOURCES_EVENT_IDS,
);

const EMPLOYEE_DOCUMENT_NEARING_EXPIRY_EVENT =
	"human-resources.employee-document.nearing-expiry.v1" as const;
const POLICY_ACKNOWLEDGEMENT_OUTSTANDING_EVENT =
	"human-resources.policy-acknowledgement.outstanding.v1" as const;

const WORKFLOW_TRANSITIONS: Partial<
	Record<
		HumanResourcesEventType,
		{
			workflow: "onboarding" | "offboarding";
			transition: "started" | "completed";
			outcome: "in_progress" | "completed";
		}
	>
> = {
	[HUMAN_RESOURCES_ONBOARDING_STARTED_EVENT]: {
		workflow: "onboarding",
		transition: "started",
		outcome: "in_progress",
	},
	[HUMAN_RESOURCES_ONBOARDING_COMPLETED_EVENT]: {
		workflow: "onboarding",
		transition: "completed",
		outcome: "completed",
	},
	[HUMAN_RESOURCES_OFFBOARDING_STARTED_EVENT]: {
		workflow: "offboarding",
		transition: "started",
		outcome: "in_progress",
	},
	[HUMAN_RESOURCES_OFFBOARDING_COMPLETED_EVENT]: {
		workflow: "offboarding",
		transition: "completed",
		outcome: "completed",
	},
};

const IDENTITY_LIFECYCLES: Partial<
	Record<HumanResourcesEventType, "joiner" | "mover" | "leaver">
> = {
	[HUMAN_RESOURCES_EMPLOYMENT_STARTED_EVENT]: "joiner",
	[HUMAN_RESOURCES_EMPLOYEE_TRANSFERRED_EVENT]: "mover",
	[HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT]: "leaver",
};

const NOTIFICATION_TEMPLATES: Partial<
	Record<
		HumanResourcesEventType,
		{
			type: "INFO" | "WARNING" | "SUCCESS" | "ACTION_REQUIRED";
			priority: "MEDIUM" | "HIGH";
			title: string;
			body: string;
		}
	>
> = {
	[EMPLOYEE_DOCUMENT_NEARING_EXPIRY_EVENT]: {
		type: "ACTION_REQUIRED",
		priority: "HIGH",
		title: "Employee document nearing expiry",
		body: "Review the expiring employee document.",
	},
	[POLICY_ACKNOWLEDGEMENT_OUTSTANDING_EVENT]: {
		type: "ACTION_REQUIRED",
		priority: "HIGH",
		title: "Policy acknowledgement outstanding",
		body: "Complete the outstanding policy acknowledgement.",
	},
	[HUMAN_RESOURCES_LEARNING_ASSIGNMENT_CREATED_EVENT]: {
		type: "INFO",
		priority: "MEDIUM",
		title: "Learning assignment created",
		body: "A learning assignment requires attention.",
	},
	[HUMAN_RESOURCES_LEAVE_APPROVED_EVENT]: {
		type: "SUCCESS",
		priority: "MEDIUM",
		title: "Leave request approved",
		body: "The leave request was approved.",
	},
	[HUMAN_RESOURCES_LEAVE_REJECTED_EVENT]: {
		type: "WARNING",
		priority: "MEDIUM",
		title: "Leave request rejected",
		body: "The leave request was rejected.",
	},
};

export type HumanResourcesWorkflowFact = {
	kind: "workflow_transition";
	eventId: string;
	organizationId: string;
	correlationId: string;
	aggregateType: string;
	aggregateId: string;
	workflow: "onboarding" | "offboarding";
	transition: "started" | "completed";
	outcome: "in_progress" | "completed";
	policySnapshot: {
		operation: string | null;
		idempotencyKey: string | null;
	};
};

export type HumanResourcesIdentityLifecycleFact = {
	kind: "identity_lifecycle";
	eventId: string;
	organizationId: string;
	correlationId: string;
	employeeEntityId: string;
	lifecycle: "joiner" | "mover" | "leaver";
	effectiveFactVersion: 1;
};

export type HumanResourcesNotificationIntent = {
	kind: "notification_intent";
	eventId: string;
	organizationId: string;
	recipientUserId: string;
	type: "INFO" | "WARNING" | "SUCCESS" | "ACTION_REQUIRED";
	priority: "MEDIUM" | "HIGH";
	title: string;
	body: string;
	deduplicationKey: string;
};

export type HumanResourcesReportingFact = {
	kind: "reporting_fact";
	factVersion: 1;
	eventId: string;
	eventType: HumanResourcesEventType;
	organizationId: string;
	correlationId: string;
	entityType: string;
	entityId: string;
	occurredAt: string;
	requiredPermission: "human-resources.employee.read";
};

export type HumanResourcesPlatformFacts = {
	workflow: HumanResourcesWorkflowFact | null;
	identity: HumanResourcesIdentityLifecycleFact | null;
	notification: HumanResourcesNotificationIntent | null;
	reporting: HumanResourcesReportingFact;
};

function isHumanResourcesEventType(
	value: string,
): value is HumanResourcesEventType {
	return HUMAN_RESOURCES_EVENT_TYPE_SET.has(value);
}

function recipientFromEvent(
	event: DomainEvent,
	fallback: string,
): Result<string> {
	const candidate = event.metadata?.recipientUserId;
	if (candidate === undefined) {
		return ok(fallback);
	}
	if (typeof candidate !== "string" || candidate.trim().length === 0) {
		return fail(
			"VALIDATION_ERROR",
			"Human Resources event recipient metadata is invalid",
		);
	}
	return ok(candidate.trim());
}

export function projectHumanResourcesPlatformFacts(
	event: DomainEvent,
): Result<HumanResourcesPlatformFacts> {
	if (!isHumanResourcesEventType(event.type)) {
		return fail("VALIDATION_ERROR", "Event is not a Human Resources event");
	}
	const parsed = humanResourcesEntityPayloadSchema.safeParse(event.payload);
	if (!parsed.success) {
		return fail(
			"VALIDATION_ERROR",
			"Human Resources event payload is invalid",
			{
				fieldErrors: parsed.error.flatten().fieldErrors,
			},
		);
	}
	if (
		parsed.data.organizationId !== event.organizationId ||
		parsed.data.correlationId !== event.correlationId
	) {
		return fail(
			"VALIDATION_ERROR",
			"Human Resources event envelope does not match its payload",
		);
	}

	const eventType = event.type as HumanResourcesEventType;
	const workflowDefinition =
		WORKFLOW_TRANSITIONS[eventType as keyof typeof WORKFLOW_TRANSITIONS];
	const identityLifecycle =
		IDENTITY_LIFECYCLES[eventType as keyof typeof IDENTITY_LIFECYCLES];
	const notificationTemplate =
		NOTIFICATION_TEMPLATES[eventType as keyof typeof NOTIFICATION_TEMPLATES];
	let notification: HumanResourcesNotificationIntent | null = null;

	if (notificationTemplate !== undefined) {
		const recipient = recipientFromEvent(event, parsed.data.actorId);
		if (!recipient.ok) {
			return recipient;
		}
		notification = {
			kind: "notification_intent",
			eventId: event.id,
			organizationId: event.organizationId,
			recipientUserId: recipient.data,
			type: notificationTemplate.type,
			priority: notificationTemplate.priority,
			title: notificationTemplate.title,
			body: notificationTemplate.body,
			deduplicationKey: `event:${event.id}`,
		};
	}

	return ok({
		workflow:
			workflowDefinition === undefined
				? null
				: {
						kind: "workflow_transition",
						eventId: event.id,
						organizationId: event.organizationId,
						correlationId: event.correlationId,
						aggregateType: parsed.data.entityType,
						aggregateId: parsed.data.entityId,
						workflow: workflowDefinition.workflow,
						transition: workflowDefinition.transition,
						outcome: workflowDefinition.outcome,
						policySnapshot: {
							operation: parsed.data.operation ?? null,
							idempotencyKey: parsed.data.idempotencyKey ?? null,
						},
					},
		identity:
			identityLifecycle === undefined
				? null
				: {
						kind: "identity_lifecycle",
						eventId: event.id,
						organizationId: event.organizationId,
						correlationId: event.correlationId,
						employeeEntityId: parsed.data.entityId,
						lifecycle: identityLifecycle,
						effectiveFactVersion: 1,
					},
		notification,
		reporting: {
			kind: "reporting_fact",
			factVersion: 1,
			eventId: event.id,
			eventType: event.type,
			organizationId: event.organizationId,
			correlationId: event.correlationId,
			entityType: parsed.data.entityType,
			entityId: parsed.data.entityId,
			occurredAt: event.occurredAt.toISOString(),
			requiredPermission: "human-resources.employee.read",
		},
	});
}
