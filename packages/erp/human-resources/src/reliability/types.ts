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

export type ReliabilityWorkItem = {
	id: string;
	organizationId: string;
	connector: ReliabilityConnector;
	operation: ReliabilityOperation;
	targetType: ReliabilityTargetType;
	targetId: string;
	correlationId: string;
	idempotencyKey: string;
	requestFingerprint: string;
	status: ReliabilityWorkStatus;
	version: number;
	attemptCount: number;
	nextAttemptAt: Date | null;
	lastAttemptAt: Date | null;
	lastErrorCode: string | null;
	lastErrorMessage: string | null;
	receiptId: string | null;
	acknowledgementDeadlineAt: Date | null;
	leaseOwner: string | null;
	leaseExpiresAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
};

export type ReliabilityExecutionOutcome =
	| { kind: "acknowledged"; receiptId: string }
	| {
			kind: "accepted";
			receiptId: string;
			acknowledgementDeadlineAt: Date;
	  };

export type ReliabilityDeadLetterRecord = {
	id: string;
	organizationId: string;
	workItemId: string;
	connector: ReliabilityConnector;
	operation: ReliabilityOperation;
	targetType: ReliabilityTargetType;
	targetId: string;
	correlationId: string;
	idempotencyKey: string;
	requestFingerprint: string;
	attemptCount: number;
	errorCode: string;
	errorMessage: string;
	failedAt: Date;
	replayedByWorkItemId: string | null;
};

export type ConnectorCursor = {
	organizationId: string;
	connector: string;
	stream: string;
	cursor: string | null;
	version: number;
	updatedAt: Date;
};
