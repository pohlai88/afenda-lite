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
import {
	HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_NEARING_EXPIRY_EVENT,
	HUMAN_RESOURCES_POLICY_ACKNOWLEDGEMENT_OUTSTANDING_EVENT,
} from "@afenda/events/schemas";

const HUMAN_RESOURCES_EVENT_TYPE_SET = new Set<string>(
	HUMAN_RESOURCES_EVENT_IDS,
);
const ISO_DATE_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

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
	[HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_NEARING_EXPIRY_EVENT]: {
		type: "ACTION_REQUIRED",
		priority: "HIGH",
		title: "Employee document nearing expiry",
		body: "Review the expiring employee document.",
	},
	[HUMAN_RESOURCES_POLICY_ACKNOWLEDGEMENT_OUTSTANDING_EVENT]: {
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

const WORK_ITEM_DEFINITIONS: Partial<
	Record<
		HumanResourcesEventType,
		{
			kind: "approval" | "task" | "reminder" | "escalation";
			title: string;
			priority: "MEDIUM" | "HIGH";
		}
	>
> = {
	"human-resources.leave.requested.v1": {
		kind: "approval",
		title: "Review leave request",
		priority: "MEDIUM",
	},
	"human-resources.time.timesheet.submitted.v1": {
		kind: "approval",
		title: "Review submitted timesheet",
		priority: "MEDIUM",
	},
	"human-resources.onboarding.started.v1": {
		kind: "task",
		title: "Complete onboarding activities",
		priority: "HIGH",
	},
	"human-resources.offboarding.started.v1": {
		kind: "task",
		title: "Complete offboarding activities",
		priority: "HIGH",
	},
	"human-resources.learning-assignment.created.v1": {
		kind: "task",
		title: "Complete learning assignment",
		priority: "MEDIUM",
	},
	"human-resources.time.exception.created.v1": {
		kind: "task",
		title: "Resolve attendance exception",
		priority: "HIGH",
	},
	"human-resources.employee-document.nearing-expiry.v1": {
		kind: "reminder",
		title: "Renew employee document",
		priority: "HIGH",
	},
	"human-resources.policy-acknowledgement.outstanding.v1": {
		kind: "reminder",
		title: "Acknowledge policy",
		priority: "HIGH",
	},
	"human-resources.certification.expiring.v1": {
		kind: "reminder",
		title: "Renew expiring certification",
		priority: "HIGH",
	},
	"human-resources.employee-document.expired.v1": {
		kind: "escalation",
		title: "Resolve expired employee document",
		priority: "HIGH",
	},
	"human-resources.work-eligibility.expired.v1": {
		kind: "escalation",
		title: "Resolve expired work eligibility",
		priority: "HIGH",
	},
};

export interface HumanResourcesWorkflowFact {
	aggregateId: string;
	aggregateType: string;
	correlationId: string;
	eventId: string;
	kind: "workflow_transition";
	organizationId: string;
	outcome: "in_progress" | "completed";
	policySnapshot: {
		operation: string | null;
		idempotencyKey: string | null;
	};
	transition: "started" | "completed";
	workflow: "onboarding" | "offboarding";
}

export interface HumanResourcesIdentityLifecycleFact {
	correlationId: string;
	effectiveFactVersion: 1;
	employeeEntityId: string;
	eventId: string;
	kind: "identity_lifecycle";
	lifecycle: "joiner" | "mover" | "leaver";
	organizationId: string;
}

export interface HumanResourcesNotificationIntent {
	body: string;
	deduplicationKey: string;
	eventId: string;
	kind: "notification_intent";
	organizationId: string;
	priority: "MEDIUM" | "HIGH";
	recipientUserId: string;
	title: string;
	type: "INFO" | "WARNING" | "SUCCESS" | "ACTION_REQUIRED";
}

export interface HumanResourcesReportingFact {
	correlationId: string;
	entityId: string;
	entityType: string;
	eventId: string;
	eventType: HumanResourcesEventType;
	factVersion: 1;
	kind: "reporting_fact";
	occurredAt: string;
	organizationId: string;
	requiredPermission: "human-resources.employee.read";
}

export interface HumanResourcesWorkItemFact {
	correlationId: string;
	deduplicationKey: string;
	dueOn: string | null;
	entityId: string;
	entityType: string;
	eventId: string;
	factVersion: 1;
	kind: "approval" | "task" | "reminder" | "escalation";
	organizationId: string;
	priority: "MEDIUM" | "HIGH";
	targetUserId: string;
	title: string;
}

export interface HumanResourcesPlatformFacts {
	identity: HumanResourcesIdentityLifecycleFact | null;
	notification: HumanResourcesNotificationIntent | null;
	reporting: HumanResourcesReportingFact;
	workflow: HumanResourcesWorkflowFact | null;
	workItems: readonly HumanResourcesWorkItemFact[];
}

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

function dueOnFromEvent(event: DomainEvent): Result<string | null> {
	const candidate = event.metadata?.dueOn;
	if (candidate === undefined) {
		return ok(null);
	}
	if (
		typeof candidate !== "string" ||
		!ISO_DATE_PATTERN.test(candidate) ||
		Number.isNaN(Date.parse(`${candidate}T00:00:00.000Z`))
	) {
		return fail(
			"VALIDATION_ERROR",
			"Human Resources work-item due date metadata is invalid",
		);
	}
	return ok(candidate);
}

export function projectHumanResourcesPlatformFacts(
	event: DomainEvent,
): Result<HumanResourcesPlatformFacts> {
	const eventType = event.type;
	if (!isHumanResourcesEventType(eventType)) {
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

	const workflowDefinition = WORKFLOW_TRANSITIONS[eventType];
	const identityLifecycle = IDENTITY_LIFECYCLES[eventType];
	const notificationTemplate = NOTIFICATION_TEMPLATES[eventType];
	let notification: HumanResourcesNotificationIntent | null = null;
	const workItems: HumanResourcesWorkItemFact[] = [];

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

	const workItemDefinition = WORK_ITEM_DEFINITIONS[eventType];
	if (workItemDefinition !== undefined) {
		const target = recipientFromEvent(event, parsed.data.actorId);
		if (!target.ok) {
			return target;
		}
		const dueOn = dueOnFromEvent(event);
		if (!dueOn.ok) {
			return dueOn;
		}
		workItems.push({
			kind: workItemDefinition.kind,
			factVersion: 1,
			eventId: event.id,
			organizationId: event.organizationId,
			correlationId: event.correlationId,
			targetUserId: target.data,
			entityType: parsed.data.entityType,
			entityId: parsed.data.entityId,
			title: workItemDefinition.title,
			priority: workItemDefinition.priority,
			dueOn: dueOn.data,
			deduplicationKey: `event:${event.id}:work-item`,
		});
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
		workItems,
		reporting: {
			kind: "reporting_fact",
			factVersion: 1,
			eventId: event.id,
			eventType,
			organizationId: event.organizationId,
			correlationId: event.correlationId,
			entityType: parsed.data.entityType,
			entityId: parsed.data.entityId,
			occurredAt: event.occurredAt.toISOString(),
			requiredPermission: "human-resources.employee.read",
		},
	});
}
