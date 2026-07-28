export type ReliabilityWorkStatus = "pending" | "succeeded" | "dead_lettered";

export type ReliabilityWorkItem = {
	id: string;
	organizationId: string;
	connector: string;
	operation: string;
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
	createdAt: Date;
	updatedAt: Date;
};

export type ReliabilityDeadLetterRecord = {
	id: string;
	organizationId: string;
	workItemId: string;
	connector: string;
	operation: string;
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
