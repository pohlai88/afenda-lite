import type { MasterDataEventType } from "./integration/event-types";
import type { MasterSearchDocumentEntityType } from "./integration/search-document";
import type { SearchProjectionPort } from "./ports";

export const EVENT_PUBLICATION_FAILURE_CODES = [
	"PUBLICATION_TRANSPORT_UNAVAILABLE",
	"PUBLICATION_TIMEOUT",
	"PUBLICATION_REJECTED",
	"PUBLICATION_UNKNOWN_FAILURE",
] as const;

export type EventPublicationFailureCode =
	(typeof EVENT_PUBLICATION_FAILURE_CODES)[number];

export const SEARCH_PROJECTION_FAILURE_CODES = [
	"SEARCH_PROJECTION_SOURCE_NOT_FOUND",
	"SEARCH_PROJECTION_DOCUMENT_INVALID",
	"SEARCH_PROJECTION_UPSERT_FAILED",
	"SEARCH_PROJECTION_REMOVE_FAILED",
	"SEARCH_PROJECTION_VERSION_CONFLICT",
] as const;

export type SearchProjectionFailureCode =
	(typeof SEARCH_PROJECTION_FAILURE_CODES)[number];

export type RecordEventPublishedInput = Readonly<{
	organizationId: string;
	eventId: string;
	eventType: MasterDataEventType;
	correlationId: string;
	publishedAt: Date;
}>;

export type RecordEventPublicationFailedInput = Readonly<{
	organizationId: string;
	eventId: string;
	eventType: MasterDataEventType;
	correlationId: string;
	attemptCount: number;
	errorCode: EventPublicationFailureCode;
	failedAt: Date;
}>;

/**
 * Best-effort, non-authoritative publication telemetry.
 *
 * This observer must not transition outbox state or invalidate a committed
 * publication outcome when its own recording fails.
 */
export interface EventPublicationObserver {
	recordPublicationFailed: (
		input: RecordEventPublicationFailedInput,
	) => Promise<void>;
	recordPublished: (input: RecordEventPublishedInput) => Promise<void>;
}

export type RecordSearchProjectionFailureInput = Readonly<{
	organizationId: string;
	entityType: MasterSearchDocumentEntityType;
	entityId: string;
	eventId: string;
	correlationId: string;
	errorCode: SearchProjectionFailureCode;
	failedAt: Date;
}>;

/**
 * Best-effort observer for search projection execution failures.
 *
 * Reconciliation mismatch reporting is owned by the reconciliation contract,
 * not this operational failure hook.
 */
export interface SearchProjectionFailureObserver {
	recordFailure: (input: RecordSearchProjectionFailureInput) => Promise<void>;
}

export type ProductionIntegrationProjectionPorts = Readonly<{
	searchProjection: SearchProjectionPort;
	publicationObserver?: EventPublicationObserver;
	projectionFailureObserver?: SearchProjectionFailureObserver;
}>;
