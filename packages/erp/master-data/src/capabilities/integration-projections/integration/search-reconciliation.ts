import type { Result } from "@afenda/errors/result";

import type { OutboxStatus } from "./outbox-record";
import type { MasterSearchDocumentEntityType } from "./search-document";

export const SEARCH_RECONCILIATION_MISMATCH_KINDS = [
	"missing_document",
	"stale_aggregate_version",
	"archived_document_present",
	"incorrect_canonical_target",
	"incorrect_organization_scope",
	"unknown_projection_schema_version",
	"outbox_stuck",
] as const;

export type SearchReconciliationMismatchKind =
	(typeof SEARCH_RECONCILIATION_MISMATCH_KINDS)[number];

type SearchDocumentMismatchKind = Exclude<
	SearchReconciliationMismatchKind,
	"outbox_stuck"
>;

type SearchDocumentMismatchBase<TKind extends SearchDocumentMismatchKind> =
	Readonly<{
		kind: TKind;
		organizationId: string;
		entityType: MasterSearchDocumentEntityType;
		entityId: string;
		detectedAt: Date;
	}>;

export type MissingSearchDocumentMismatch =
	SearchDocumentMismatchBase<"missing_document"> &
		Readonly<{
			expectedAggregateVersion: number;
		}>;

export type StaleAggregateVersionMismatch =
	SearchDocumentMismatchBase<"stale_aggregate_version"> &
		Readonly<{
			expectedAggregateVersion: number;
			actualAggregateVersion: number;
		}>;

export type ArchivedDocumentPresentMismatch =
	SearchDocumentMismatchBase<"archived_document_present"> &
		Readonly<{
			actualAggregateVersion: number;
		}>;

export type IncorrectCanonicalTargetMismatch =
	SearchDocumentMismatchBase<"incorrect_canonical_target"> &
		Readonly<{
			expectedCanonicalEntityId: string;
			actualCanonicalEntityId: string;
		}>;

export type IncorrectOrganizationScopeMismatch =
	SearchDocumentMismatchBase<"incorrect_organization_scope"> &
		Readonly<{
			expectedOrganizationId: string;
			actualOrganizationId: string;
		}>;

export type UnknownProjectionSchemaVersionMismatch =
	SearchDocumentMismatchBase<"unknown_projection_schema_version"> &
		Readonly<{
			actualProjectionSchemaVersion: number;
		}>;

export type OutboxStuckMismatch = Readonly<{
	kind: "outbox_stuck";
	organizationId: string;
	eventId: string;
	eventType: string;
	status: Exclude<OutboxStatus, "published" | "dead_lettered">;
	availableAt: Date;
	attemptCount: number;
	lastAttemptAt: Date | null;
	detectedAt: Date;
	entityType?: MasterSearchDocumentEntityType;
	entityId?: string;
}>;

export type SearchDocumentMismatch =
	| MissingSearchDocumentMismatch
	| StaleAggregateVersionMismatch
	| ArchivedDocumentPresentMismatch
	| IncorrectCanonicalTargetMismatch
	| IncorrectOrganizationScopeMismatch
	| UnknownProjectionSchemaVersionMismatch;

export type SearchDeliveryMismatch = OutboxStuckMismatch;

export type SearchReconciliationMismatch =
	| SearchDocumentMismatch
	| SearchDeliveryMismatch;

export interface SearchReconciliationReporter {
	recordMismatch(
		mismatch: SearchReconciliationMismatch,
	): Promise<Result<SearchReconciliationMismatch>>;
}

export function defineSearchReconciliationMismatch<
	const TMismatch extends SearchReconciliationMismatch,
>(mismatch: TMismatch): TMismatch {
	assertNonBlank("organizationId", mismatch.organizationId);
	assertValidDate("detectedAt", mismatch.detectedAt);

	switch (mismatch.kind) {
		case "missing_document":
			assertDocumentIdentity(mismatch);
			assertPositiveVersion(
				"expectedAggregateVersion",
				mismatch.expectedAggregateVersion,
			);
			break;
		case "stale_aggregate_version":
			assertDocumentIdentity(mismatch);
			assertPositiveVersion(
				"expectedAggregateVersion",
				mismatch.expectedAggregateVersion,
			);
			assertPositiveVersion(
				"actualAggregateVersion",
				mismatch.actualAggregateVersion,
			);
			if (
				mismatch.actualAggregateVersion >= mismatch.expectedAggregateVersion
			) {
				throw new Error(
					"stale aggregate mismatch requires actualAggregateVersion < expectedAggregateVersion",
				);
			}
			break;
		case "archived_document_present":
			assertDocumentIdentity(mismatch);
			assertPositiveVersion(
				"actualAggregateVersion",
				mismatch.actualAggregateVersion,
			);
			break;
		case "incorrect_canonical_target":
			assertDocumentIdentity(mismatch);
			assertNonBlank(
				"expectedCanonicalEntityId",
				mismatch.expectedCanonicalEntityId,
			);
			assertNonBlank(
				"actualCanonicalEntityId",
				mismatch.actualCanonicalEntityId,
			);
			if (
				mismatch.expectedCanonicalEntityId === mismatch.actualCanonicalEntityId
			) {
				throw new Error("canonical target mismatch requires differing ids");
			}
			break;
		case "incorrect_organization_scope":
			assertDocumentIdentity(mismatch);
			assertNonBlank("expectedOrganizationId", mismatch.expectedOrganizationId);
			assertNonBlank("actualOrganizationId", mismatch.actualOrganizationId);
			if (mismatch.expectedOrganizationId === mismatch.actualOrganizationId) {
				throw new Error("organization scope mismatch requires differing ids");
			}
			break;
		case "unknown_projection_schema_version":
			assertDocumentIdentity(mismatch);
			assertPositiveVersion(
				"actualProjectionSchemaVersion",
				mismatch.actualProjectionSchemaVersion,
			);
			break;
		case "outbox_stuck":
			assertNonBlank("eventId", mismatch.eventId);
			assertNonBlank("eventType", mismatch.eventType);
			assertValidDate("availableAt", mismatch.availableAt);
			assertNonNegativeInteger("attemptCount", mismatch.attemptCount);
			if (mismatch.lastAttemptAt !== null) {
				assertValidDate("lastAttemptAt", mismatch.lastAttemptAt);
			}
			if (mismatch.entityId !== undefined) {
				assertNonBlank("entityId", mismatch.entityId);
			}
			break;
		default:
			assertNever(mismatch);
	}

	return mismatch;
}

function assertDocumentIdentity(mismatch: SearchDocumentMismatch): void {
	assertNonBlank("entityId", mismatch.entityId);
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

function assertNonNegativeInteger(name: string, value: number): void {
	if (!Number.isSafeInteger(value) || value < 0) {
		throw new Error(`${name} must be a non-negative safe integer`);
	}
}

function assertValidDate(name: string, value: Date): void {
	if (!Number.isFinite(value.getTime())) {
		throw new Error(`${name} must be a valid date`);
	}
}

function assertNever(value: never): never {
	throw new Error(`Unsupported reconciliation mismatch: ${String(value)}`);
}
