import type { Result } from "@afenda/errors";
import type { HumanResourcesOfferId } from "../brands";
import type {
	HireAttempt,
	HireCompensationLogEntry,
	HireSagaStep,
} from "../hire-orchestration/types";
import type { MutationPorts } from "../ports";
import type { HumanResourcesMutationMeta } from "../shared/mutation-meta";

export interface IdempotentHireAttemptRecord {
	attempt: HireAttempt;
	requestFingerprint: string;
}

export interface HireAttemptCreateRecord {
	correlationId: string;
	createdBy: string;
	idempotencyKey: string;
	offerId: HumanResourcesOfferId;
	organizationId: string;
	requestFingerprint: string;
}

export interface HireAttemptProgressUpdate {
	actorUserId: string;
	assignmentId?: HireAttempt["assignmentId"] | undefined;
	attemptId: HireAttempt["id"];
	compensationLog?: readonly HireCompensationLogEntry[] | undefined;
	currentStep: HireSagaStep | null;
	employeeId?: HireAttempt["employeeId"] | undefined;
	employmentId?: HireAttempt["employmentId"] | undefined;
	expectedVersion: number;
	onboardingCaseId?: HireAttempt["onboardingCaseId"] | undefined;
	organizationId: string;
	personId?: HireAttempt["personId"] | undefined;
	status?: HireAttempt["status"] | undefined;
	workerId?: HireAttempt["workerId"] | undefined;
}

export interface HireAttemptCompletionInput {
	actorUserId: string;
	attemptId: HireAttempt["id"];
	expectedVersion: number;
	organizationId: string;
}

/**
 * Persistence contract for hire saga progress.
 *
 * Cross-domain orchestration stays in application commands — this slice only
 * records hire attempt state for replay and compensation bookkeeping.
 */
export interface HumanResourcesHireOrchestrationStore {
	completeHireAttempt: (
		input: HireAttemptCompletionInput,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<HireAttempt>>;
	createHireAttempt: (
		record: HireAttemptCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<HireAttempt>>;
	findHireAttemptByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentHireAttemptRecord | null>>;

	findOpenHireAttemptByOfferId: (input: {
		organizationId: string;
		offerId: HumanResourcesOfferId;
	}) => Promise<Result<HireAttempt | null>>;

	updateHireAttemptProgress: (
		input: HireAttemptProgressUpdate,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<HireAttempt>>;
}
