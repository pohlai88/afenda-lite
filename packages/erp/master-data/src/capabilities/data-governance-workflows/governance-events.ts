/**
 * # Transaction and Event Contract
 *
 * Governance events are bounded integration facts produced by authoritative
 * package-owned transactions.
 *
 * A committed workflow transition must atomically persist:
 *
 * - workflow state
 * - workflow version increment
 * - governance audit fact
 * - governance outbox event
 *
 * An applied master-data operation must atomically persist:
 *
 * - authoritative master mutation
 * - target version increment
 * - change-request application outcome
 * - master-data audit fact
 * - master-data outbox event
 *
 * Publishing to an external broker may happen after commit through an outbox
 * dispatcher. Writing directly to a broker is not part of the database
 * transaction contract.
 *
 * Event payloads must contain stable identifiers and bounded outcome facts.
 * They must not contain unrestricted proposals, imported rows, snapshots,
 * secrets, credentials, or unnecessary sensitive information.
 */

export const GOVERNANCE_EVENT_TYPES = [
	"master_data.change_request.created",
	"master_data.change_request.updated",
	"master_data.change_request.submitted",
	"master_data.change_request.approved",
	"master_data.change_request.rejected",
	"master_data.change_request.apply_started",
	"master_data.change_request.applied",
	"master_data.change_request.failed",
	"master_data.change_request.cancelled",
	"master_data.change_request.expired",
	"master_data.change_request.superseded",
	"master_data.import_batch.created",
	"master_data.import_batch.parsed",
	"master_data.import_batch.validation_started",
	"master_data.import_batch.validated",
	"master_data.import_batch.validation_failed",
	"master_data.import_batch.submitted",
	"master_data.import_batch.approved",
	"master_data.import_batch.rejected",
	"master_data.import_batch.apply_started",
	"master_data.import_batch.applied",
	"master_data.import_batch.partially_applied",
	"master_data.import_batch.failed",
	"master_data.import_batch.cancelled",
	"master_data.import_batch.expired",
	"master_data.import_batch.superseded",
	"master_data.duplicate_warning.created",
	"master_data.duplicate_warning.reviewed",
	"master_data.duplicate_warning.merge_requested",
	"master_data.duplicate_warning.resolved",
	"master_data.duplicate_warning.dismissed",
	"master_data.party.merge_requested",
	"master_data.party.merge_started",
	"master_data.party.merged",
	"master_data.party.merge_failed",
] as const;

export type GovernanceEventType = (typeof GOVERNANCE_EVENT_TYPES)[number];

export const GOVERNANCE_EVENT_OUTCOMES = [
	"created",
	"updated",
	"parsed",
	"validation_started",
	"submitted",
	"validated",
	"validation_failed",
	"approved",
	"rejected",
	"apply_started",
	"applied",
	"partially_applied",
	"failed",
	"cancelled",
	"expired",
	"superseded",
	"reviewed",
	"merge_requested",
	"merge_started",
	"merged",
	"resolved",
	"dismissed",
] as const;

export type GovernanceEventOutcome = (typeof GOVERNANCE_EVENT_OUTCOMES)[number];

export const GOVERNANCE_EVENT_ENTITY_TYPES = [
	"change_request",
	"import_batch",
	"duplicate_warning",
	"party",
	"item",
	"item_group",
	"item_template",
	"item_variant",
	"warehouse",
	"payment_term",
	"tax_registration",
] as const;

export type GovernanceEventEntityType =
	(typeof GOVERNANCE_EVENT_ENTITY_TYPES)[number];

export const GOVERNANCE_EVENT_ACTOR_TYPES = [
	"user",
	"system",
	"service",
] as const;

export type GovernanceEventActorType =
	(typeof GOVERNANCE_EVENT_ACTOR_TYPES)[number];

export type GovernanceEventActor =
	| Readonly<{
			type: "user";
			userId: string;
			serviceId?: never;
	  }>
	| Readonly<{
			type: "service";
			serviceId: string;
			userId?: never;
	  }>
	| Readonly<{
			type: "system";
			userId?: never;
			serviceId?: never;
	  }>;

export type GovernanceEventFactValue = string | number | boolean | null;

export type GovernanceEventFacts = Readonly<
	Record<string, GovernanceEventFactValue>
>;

export type GovernanceWorkflowEventType =
	| "change_request"
	| "import_batch"
	| "duplicate_warning"
	| "party_merge";

type GovernanceEventBase = Readonly<{
	eventId: string;
	schemaVersion: 1;
	eventType: GovernanceEventType;
	outcome: GovernanceEventOutcome;
	organizationId: string;
	actor: GovernanceEventActor;
	correlationId: string;
	causationId: string | null;
	workflowType: GovernanceWorkflowEventType;
	workflowId: string;
	entityType: GovernanceEventEntityType;
	entityId: string | null;
	workflowVersion: number;
	entityVersion: number | null;
	occurredAt: Date;
	facts: GovernanceEventFacts;
}>;

type EventCase<
	TEventType extends GovernanceEventType,
	TOutcome extends GovernanceEventOutcome,
	TWorkflow extends GovernanceWorkflowEventType,
	TEntity extends GovernanceEventEntityType,
	TActor extends GovernanceEventActor = GovernanceEventActor,
> = GovernanceEventBase &
	Readonly<{
		eventType: TEventType;
		outcome: TOutcome;
		workflowType: TWorkflow;
		entityType: TEntity;
		actor: TActor;
	}>;

type SystemOrServiceActor = Extract<
	GovernanceEventActor,
	{ type: "system" | "service" }
>;

export type GovernanceEventPayload =
	| EventCase<
			"master_data.change_request.created",
			"created",
			"change_request",
			"change_request"
	  >
	| EventCase<
			"master_data.change_request.updated",
			"updated",
			"change_request",
			"change_request"
	  >
	| EventCase<
			"master_data.change_request.submitted",
			"submitted",
			"change_request",
			"change_request"
	  >
	| EventCase<
			"master_data.change_request.approved",
			"approved",
			"change_request",
			"change_request"
	  >
	| EventCase<
			"master_data.change_request.rejected",
			"rejected",
			"change_request",
			"change_request"
	  >
	| EventCase<
			"master_data.change_request.apply_started",
			"apply_started",
			"change_request",
			"change_request"
	  >
	| EventCase<
			"master_data.change_request.applied",
			"applied",
			"change_request",
			"change_request"
	  >
	| EventCase<
			"master_data.change_request.failed",
			"failed",
			"change_request",
			"change_request"
	  >
	| EventCase<
			"master_data.change_request.cancelled",
			"cancelled",
			"change_request",
			"change_request"
	  >
	| EventCase<
			"master_data.change_request.expired",
			"expired",
			"change_request",
			"change_request",
			SystemOrServiceActor
	  >
	| EventCase<
			"master_data.change_request.superseded",
			"superseded",
			"change_request",
			"change_request"
	  >
	| EventCase<
			"master_data.import_batch.created",
			"created",
			"import_batch",
			"import_batch"
	  >
	| EventCase<
			"master_data.import_batch.parsed",
			"parsed",
			"import_batch",
			"import_batch",
			SystemOrServiceActor
	  >
	| EventCase<
			"master_data.import_batch.validation_started",
			"validation_started",
			"import_batch",
			"import_batch",
			SystemOrServiceActor
	  >
	| EventCase<
			"master_data.import_batch.validated",
			"validated",
			"import_batch",
			"import_batch",
			SystemOrServiceActor
	  >
	| EventCase<
			"master_data.import_batch.validation_failed",
			"validation_failed",
			"import_batch",
			"import_batch",
			SystemOrServiceActor
	  >
	| EventCase<
			"master_data.import_batch.submitted",
			"submitted",
			"import_batch",
			"import_batch"
	  >
	| EventCase<
			"master_data.import_batch.approved",
			"approved",
			"import_batch",
			"import_batch"
	  >
	| EventCase<
			"master_data.import_batch.rejected",
			"rejected",
			"import_batch",
			"import_batch"
	  >
	| EventCase<
			"master_data.import_batch.apply_started",
			"apply_started",
			"import_batch",
			"import_batch"
	  >
	| EventCase<
			"master_data.import_batch.applied",
			"applied",
			"import_batch",
			"import_batch"
	  >
	| EventCase<
			"master_data.import_batch.partially_applied",
			"partially_applied",
			"import_batch",
			"import_batch"
	  >
	| EventCase<
			"master_data.import_batch.failed",
			"failed",
			"import_batch",
			"import_batch"
	  >
	| EventCase<
			"master_data.import_batch.cancelled",
			"cancelled",
			"import_batch",
			"import_batch"
	  >
	| EventCase<
			"master_data.import_batch.expired",
			"expired",
			"import_batch",
			"import_batch",
			SystemOrServiceActor
	  >
	| EventCase<
			"master_data.import_batch.superseded",
			"superseded",
			"import_batch",
			"import_batch"
	  >
	| EventCase<
			"master_data.duplicate_warning.created",
			"created",
			"duplicate_warning",
			"duplicate_warning"
	  >
	| EventCase<
			"master_data.duplicate_warning.reviewed",
			"reviewed",
			"duplicate_warning",
			"duplicate_warning"
	  >
	| EventCase<
			"master_data.duplicate_warning.merge_requested",
			"merge_requested",
			"duplicate_warning",
			"duplicate_warning"
	  >
	| EventCase<
			"master_data.duplicate_warning.resolved",
			"resolved",
			"duplicate_warning",
			"duplicate_warning"
	  >
	| EventCase<
			"master_data.duplicate_warning.dismissed",
			"dismissed",
			"duplicate_warning",
			"duplicate_warning"
	  >
	| EventCase<
			"master_data.party.merge_requested",
			"merge_requested",
			"party_merge",
			"party"
	  >
	| EventCase<
			"master_data.party.merge_started",
			"merge_started",
			"party_merge",
			"party"
	  >
	| EventCase<"master_data.party.merged", "merged", "party_merge", "party">
	| EventCase<
			"master_data.party.merge_failed",
			"failed",
			"party_merge",
			"party"
	  >;

export const MAX_GOVERNANCE_EVENT_FACTS = 24 as const;
export const MAX_GOVERNANCE_EVENT_FACT_KEY_LENGTH = 64 as const;
export const MAX_GOVERNANCE_EVENT_FACT_STRING_LENGTH = 512 as const;

const GOVERNANCE_EVENT_FACT_KEY_PATTERN = /^[a-z][a-z0-9]*(?:[A-Z][a-z0-9]*)*$/;

export function assertGovernanceEventFactsBounded(
	facts: GovernanceEventFacts,
): void {
	const entries = Object.entries(facts);
	if (entries.length > MAX_GOVERNANCE_EVENT_FACTS) {
		throw new Error(
			`Governance event facts exceed the maximum of ${MAX_GOVERNANCE_EVENT_FACTS}`,
		);
	}
	for (const [key, value] of entries) {
		if (
			key.length === 0 ||
			key.length > MAX_GOVERNANCE_EVENT_FACT_KEY_LENGTH ||
			!GOVERNANCE_EVENT_FACT_KEY_PATTERN.test(key)
		) {
			throw new Error(`Invalid governance event fact key: ${key}`);
		}
		if (typeof value === "number" && !Number.isFinite(value)) {
			throw new Error(
				`Governance event fact "${key}" must contain a finite number`,
			);
		}
		if (
			typeof value === "string" &&
			value.length > MAX_GOVERNANCE_EVENT_FACT_STRING_LENGTH
		) {
			throw new Error(
				`Governance event fact "${key}" exceeds the string-size limit`,
			);
		}
	}
}

export type GovernanceEventMetadata = Readonly<{
	eventId: string;
	organizationId: string;
	actor: GovernanceEventActor;
	correlationId: string;
	causationId: string | null;
	workflowId: string;
	workflowVersion: number;
	entityId: string | null;
	entityVersion: number | null;
	occurredAt: Date;
	facts?: GovernanceEventFacts;
}>;

export function defineGovernanceEvent<
	const TEvent extends GovernanceEventPayload,
>(event: TEvent): TEvent {
	assertNonEmpty("eventId", event.eventId);
	assertNonEmpty("organizationId", event.organizationId);
	assertNonEmpty("correlationId", event.correlationId);
	assertNonEmpty("workflowId", event.workflowId);
	if (
		!Number.isSafeInteger(event.workflowVersion) ||
		event.workflowVersion < 1
	) {
		throw new Error(
			"Governance event workflowVersion must be a positive safe integer",
		);
	}
	if (
		event.entityVersion !== null &&
		(!Number.isSafeInteger(event.entityVersion) || event.entityVersion < 1)
	) {
		throw new Error(
			"Governance event entityVersion must be null or a positive safe integer",
		);
	}
	if (!Number.isFinite(event.occurredAt.getTime())) {
		throw new Error("Governance event occurredAt must be a valid date");
	}
	if (event.actor.type === "user") {
		assertNonEmpty("actor.userId", event.actor.userId);
	}
	if (event.actor.type === "service") {
		assertNonEmpty("actor.serviceId", event.actor.serviceId);
	}
	assertGovernanceEventFactsBounded(event.facts);
	return event;
}

export type GovernanceAuditFact = Readonly<{
	id: string;
	organizationId: string;
	actor: GovernanceEventActor;
	action: string;
	entityType: GovernanceEventEntityType;
	entityId: string | null;
	correlationId: string;
	occurredAt: Date;
	facts: GovernanceEventFacts;
}>;

export type GovernanceOutboxRecord = Readonly<{
	id: string;
	organizationId: string;
	eventType: GovernanceEventType;
	aggregateType: GovernanceEventPayload["workflowType"];
	aggregateId: string;
	aggregateVersion: number;
	payload: GovernanceEventPayload;
	occurredAt: Date;
	publishedAt: Date | null;
	attemptCount: number;
	lastFailureCode: string | null;
	createdAt: Date;
}>;

export interface GovernanceTransaction {
	insertAuditFact: (input: GovernanceAuditFact) => Promise<void>;
	insertOutboxEvent: (input: GovernanceOutboxRecord) => Promise<void>;
}

function assertNonEmpty(name: string, value: string): void {
	if (value.trim().length === 0) {
		throw new Error(`${name} must not be empty`);
	}
}
