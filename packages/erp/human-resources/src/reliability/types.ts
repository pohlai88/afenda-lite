import type {
	ReliabilityConnector,
	ReliabilityOperation,
	ReliabilityTargetType,
} from "./operations";

export type ReliabilityWorkStatus =
	| "pending"
	| "processing"
	| "awaiting_acknowledgement"
	| "succeeded"
	| "dead_lettered";

export interface ReliabilityWorkItem {
	acknowledgementDeadlineAt: Date | null;
	attemptCount: number;
	connector: ReliabilityConnector;
	correlationId: string;
	createdAt: Date;
	id: string;
	idempotencyKey: string;
	lastAttemptAt: Date | null;
	lastErrorCode: string | null;
	lastErrorMessage: string | null;
	leaseExpiresAt: Date | null;
	leaseOwner: string | null;
	nextAttemptAt: Date | null;
	operation: ReliabilityOperation;
	organizationId: string;
	receiptId: string | null;
	requestFingerprint: string;
	status: ReliabilityWorkStatus;
	targetId: string;
	targetType: ReliabilityTargetType;
	updatedAt: Date;
	version: number;
}

export type ReliabilityExecutionOutcome =
	| { kind: "acknowledged"; receiptId: string }
	| {
			kind: "accepted";
			receiptId: string;
			acknowledgementDeadlineAt: Date;
	  };

export interface ReliabilityDeadLetterRecord {
	attemptCount: number;
	connector: ReliabilityConnector;
	correlationId: string;
	errorCode: string;
	errorMessage: string;
	failedAt: Date;
	id: string;
	idempotencyKey: string;
	operation: ReliabilityOperation;
	organizationId: string;
	replayedByWorkItemId: string | null;
	requestFingerprint: string;
	targetId: string;
	targetType: ReliabilityTargetType;
	workItemId: string;
}

export interface ConnectorCursor {
	connector: string;
	cursor: string | null;
	organizationId: string;
	stream: string;
	updatedAt: Date;
	version: number;
}
