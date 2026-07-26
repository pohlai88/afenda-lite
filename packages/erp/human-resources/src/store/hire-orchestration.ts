import type { Result } from "@afenda/errors/result";
import type { HumanResourcesOfferId } from "../brands";
import type {
	HireAttempt,
	HireCompensationLogEntry,
	HireSagaStep,
} from "../hire-orchestration/types";
import type { MutationPorts } from "../ports";
import type { HumanResourcesMutationMeta } from "../shared/mutation-meta";

export type IdempotentHireAttemptRecord = {
	attempt: HireAttempt;
	requestFingerprint: string;
};

export type HireAttemptCreateRecord = {
	organizationId: string;
	offerId: HumanResourcesOfferId;
	correlationId: string;
	idempotencyKey: string;
	requestFingerprint: string;
	createdBy: string;
};

export type HireAttemptProgressUpdate = {
	organizationId: string;
	attemptId: HireAttempt["id"];
	expectedVersion: number;
	currentStep: HireSagaStep | null;
	personId?: HireAttempt["personId"];
	employeeId?: HireAttempt["employeeId"];
	employmentId?: HireAttempt["employmentId"];
	workerId?: HireAttempt["workerId"];
	assignmentId?: HireAttempt["assignmentId"];
	onboardingCaseId?: HireAttempt["onboardingCaseId"];
	compensationLog?: readonly HireCompensationLogEntry[];
	status?: HireAttempt["status"];
	actorUserId: string;
};

/**
 * Persistence contract for hire saga progress.
 *
 * Cross-domain orchestration stays in application commands — this slice only
 * records hire attempt state for replay and compensation bookkeeping.
 */
export type HumanResourcesHireOrchestrationStore = {
	findHireAttemptByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentHireAttemptRecord | null>>;

	findOpenHireAttemptByOfferId(input: {
		organizationId: string;
		offerId: HumanResourcesOfferId;
	}): Promise<Result<HireAttempt | null>>;

	createHireAttempt(
		record: HireAttemptCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<HireAttempt>>;

	updateHireAttemptProgress(
		input: HireAttemptProgressUpdate,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<HireAttempt>>;
};
