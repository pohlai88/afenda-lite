import type { MasterDataAggregateType } from "./aggregate-types";

export const MASTER_DATA_AUDIT_MODULE_ID = "master-data" as const;

export const MASTER_DATA_AUDIT_ENTITY_TYPES = [
	"party",
	"item",
	"warehouse",
	"organization_dimension",
	"item_group",
	"payment_term",
	"tax_registration",
	"item_template",
	"item_variant",
] as const satisfies readonly MasterDataAggregateType[];

export type MasterDataAuditEntityType = MasterDataAggregateType;

const AUDIT_FIELD_PATTERN = /^[a-z][a-zA-Z0-9]*(?:\.[a-z][a-zA-Z0-9]*)*$/;
const MAX_AUDIT_METADATA_ENTRIES = 24 as const;
const MAX_AUDIT_METADATA_KEY_LENGTH = 64 as const;
const MAX_AUDIT_METADATA_STRING_LENGTH = 512 as const;

export type MasterDataAuditOperation =
	| "create"
	| "update"
	| "activate"
	| "block"
	| "retire"
	| "archive"
	| "merge"
	| "apply_change_request"
	| "apply_import_row";

export type MasterDataAuditFact = Readonly<{
	auditId: string;
	organizationId: string;
	moduleId: typeof MASTER_DATA_AUDIT_MODULE_ID;
	entityType: MasterDataAuditEntityType;
	entityId: string;
	operation: MasterDataAuditOperation;
	actorUserId: string;
	correlationId: string;
	causationId: string | null;
	previousVersion: number | null;
	resultingVersion: number;
	reasonCode: string | null;
	changedFields: readonly string[];
	previousState?: string;
	resultingState?: string;
	sourceEntityId?: string;
	canonicalTargetId?: string;
	occurredAt: Date;
	metadata: Readonly<Record<string, string | number | boolean | null>>;
}>;

export type MutationCommit<T> = Readonly<{
	/**
	 * Authoritative entity state committed by the transaction.
	 */
	entity: T;
	/**
	 * Audit facts inserted by the same transaction.
	 */
	auditIds: readonly string[];
	/**
	 * Outbox event IDs inserted by the same transaction.
	 */
	eventIds: readonly string[];
}>;

export function defineMasterDataAuditFact(
	fact: MasterDataAuditFact,
): MasterDataAuditFact {
	assertNonBlank("auditId", fact.auditId);
	assertNonBlank("organizationId", fact.organizationId);
	if (fact.moduleId !== MASTER_DATA_AUDIT_MODULE_ID) {
		throw new Error(`moduleId must be ${MASTER_DATA_AUDIT_MODULE_ID}`);
	}
	assertNonBlank("entityType", fact.entityType);
	assertNonBlank("entityId", fact.entityId);
	assertNonBlank("actorUserId", fact.actorUserId);
	assertNonBlank("correlationId", fact.correlationId);
	assertNullableNonBlank("causationId", fact.causationId);
	assertNullableNonBlank("reasonCode", fact.reasonCode);
	assertOptionalNonBlank("previousState", fact.previousState);
	assertOptionalNonBlank("resultingState", fact.resultingState);
	assertOptionalNonBlank("sourceEntityId", fact.sourceEntityId);
	assertOptionalNonBlank("canonicalTargetId", fact.canonicalTargetId);
	if (fact.previousVersion !== null) {
		assertPositiveVersion("previousVersion", fact.previousVersion);
	}
	assertPositiveVersion("resultingVersion", fact.resultingVersion);
	if (
		fact.previousVersion !== null &&
		fact.resultingVersion <= fact.previousVersion
	) {
		throw new Error("resultingVersion must advance previousVersion");
	}
	assertOperationInvariants(fact);
	assertChangedFields(fact.changedFields);
	assertMetadata(fact.metadata);
	if (!Number.isFinite(fact.occurredAt.getTime())) {
		throw new Error("occurredAt must be a valid date");
	}
	return fact;
}

export function defineMutationCommit<T>(
	commit: MutationCommit<T>,
): MutationCommit<T> {
	assertUniqueNonBlankIds("auditIds", commit.auditIds);
	assertUniqueNonBlankIds("eventIds", commit.eventIds);
	return commit;
}

function assertOperationInvariants(fact: MasterDataAuditFact): void {
	switch (fact.operation) {
		case "create":
			assertCreateOperation(fact);
			break;
		case "update":
		case "apply_change_request":
		case "apply_import_row":
			assertPreviousVersion(fact);
			break;
		case "activate":
		case "block":
		case "retire":
		case "archive":
			assertLifecycleOperation(fact);
			break;
		case "merge":
			assertMergeOperation(fact);
			break;
		default:
			assertNever(fact.operation);
	}
}

function assertCreateOperation(fact: MasterDataAuditFact): void {
	if (fact.previousVersion !== null) {
		throw new Error("create audit facts must not have a previousVersion");
	}
	if (fact.resultingVersion !== 1) {
		throw new Error("create audit facts must result in version 1");
	}
}

function assertPreviousVersion(fact: MasterDataAuditFact): void {
	if (fact.previousVersion === null) {
		throw new Error(`${fact.operation} audit facts require previousVersion`);
	}
}

function assertLifecycleOperation(fact: MasterDataAuditFact): void {
	assertPreviousVersion(fact);
	if (fact.previousState === undefined || fact.resultingState === undefined) {
		throw new Error(
			`${fact.operation} audit facts require previousState and resultingState`,
		);
	}
	if (fact.previousState === fact.resultingState) {
		throw new Error("previousState and resultingState must differ");
	}
}

function assertMergeOperation(fact: MasterDataAuditFact): void {
	assertPreviousVersion(fact);
	if (
		fact.sourceEntityId === undefined ||
		fact.canonicalTargetId === undefined
	) {
		throw new Error(
			"merge audit facts require sourceEntityId and canonicalTargetId",
		);
	}
	if (fact.sourceEntityId === fact.canonicalTargetId) {
		throw new Error("sourceEntityId and canonicalTargetId must differ");
	}
}

function assertChangedFields(fields: readonly string[]): void {
	const seen = new Set<string>();
	for (const field of fields) {
		assertNonBlank("changedFields", field);
		if (field !== field.trim()) {
			throw new Error(
				"changedFields entries must not contain surrounding whitespace",
			);
		}
		if (!AUDIT_FIELD_PATTERN.test(field)) {
			throw new Error(`changedFields contains invalid field path: ${field}`);
		}
		if (seen.has(field)) {
			throw new Error(`changedFields contains duplicate field: ${field}`);
		}
		seen.add(field);
	}
}

function assertMetadata(
	metadata: Readonly<Record<string, string | number | boolean | null>>,
): void {
	const entries = Object.entries(metadata);
	if (entries.length > MAX_AUDIT_METADATA_ENTRIES) {
		throw new Error(
			`metadata must not exceed ${MAX_AUDIT_METADATA_ENTRIES} entries`,
		);
	}
	for (const [key, value] of entries) {
		assertNonBlank("metadata key", key);
		if (key !== key.trim()) {
			throw new Error("metadata keys must not contain surrounding whitespace");
		}
		if (key.length > MAX_AUDIT_METADATA_KEY_LENGTH) {
			throw new Error(`metadata key exceeds ${MAX_AUDIT_METADATA_KEY_LENGTH}`);
		}
		if (typeof value === "number" && !Number.isFinite(value)) {
			throw new Error(`metadata.${key} must be a finite number`);
		}
		if (
			typeof value === "string" &&
			value.length > MAX_AUDIT_METADATA_STRING_LENGTH
		) {
			throw new Error(
				`metadata.${key} exceeds ${MAX_AUDIT_METADATA_STRING_LENGTH} characters`,
			);
		}
	}
}

function assertNullableNonBlank(name: string, value: string | null): void {
	if (value !== null) {
		assertNonBlank(name, value);
	}
}

function assertOptionalNonBlank(name: string, value: string | undefined): void {
	if (value !== undefined) {
		assertNonBlank(name, value);
	}
}

function assertUniqueNonBlankIds(
	name: string,
	values: readonly string[],
): void {
	const seen = new Set<string>();
	for (const value of values) {
		assertNonBlank(name, value);
		if (seen.has(value)) {
			throw new Error(`${name} contains duplicate id: ${value}`);
		}
		seen.add(value);
	}
}

function assertNonBlank(name: string, value: string): void {
	if (value.trim().length === 0) {
		throw new Error(`${name} must not be blank`);
	}
}

function assertPositiveVersion(name: string, value: number): void {
	if (!Number.isSafeInteger(value) || value < 1) {
		throw new Error(`${name} must be a positive safe integer`);
	}
}

function assertNever(value: never): never {
	throw new Error(`Unsupported audit operation: ${String(value)}`);
}
