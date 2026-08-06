import { errorResult } from "@afenda/errors";
import type {
	PayrollJob,
	PayrollJobDeadLetter,
	PayrollJobWorkItem,
} from "./contract";
import type { PayrollJobStore } from "./jobs.store";

const clone = <T>(value: T): T => structuredClone(value);

export interface JobsMemoryState {
	deadLetters: Map<string, PayrollJobDeadLetter>;
	jobKeys: Map<string, string>;
	jobs: Map<string, PayrollJob>;
	workItems: Map<string, PayrollJobWorkItem>;
}

export function createJobsMemoryState(): JobsMemoryState {
	return {
		deadLetters: new Map(),
		jobKeys: new Map(),
		jobs: new Map(),
		workItems: new Map(),
	};
}

export function resetJobsMemoryState(state: JobsMemoryState): void {
	state.deadLetters.clear();
	state.jobKeys.clear();
	state.jobs.clear();
	state.workItems.clear();
}

function scoped(organizationId: string, value: string): string {
	return `${organizationId}:${value}`;
}

export function createMemoryJobsMethods(
	state: JobsMemoryState,
): PayrollJobStore {
	return {
		findJobByIdempotencyKey(input) {
			const jobId = state.jobKeys.get(
				scoped(input.organizationId, input.idempotencyKey),
			);
			const job = jobId === undefined ? undefined : state.jobs.get(jobId);
			return Promise.resolve(
				errorResult.ok(job === undefined ? null : clone(job)),
			);
		},
		getJob(input) {
			const job = state.jobs.get(input.jobId);
			return Promise.resolve(
				errorResult.ok(
					job?.organizationId === input.organizationId ? clone(job) : null,
				),
			);
		},
		getWorkItem(input) {
			const workItem = state.workItems.get(input.workItemId);
			return Promise.resolve(
				errorResult.ok(
					workItem?.organizationId === input.organizationId
						? clone(workItem)
						: null,
				),
			);
		},
		createJob(input) {
			const key = scoped(input.job.organizationId, input.job.idempotencyKey);
			if (
				state.jobs.has(input.job.id) ||
				state.jobKeys.has(key) ||
				state.workItems.has(input.workItem.id)
			) {
				return Promise.resolve(
					errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
					}),
				);
			}
			state.jobs.set(input.job.id, clone(input.job));
			state.jobKeys.set(key, input.job.id);
			state.workItems.set(input.workItem.id, clone(input.workItem));
			return Promise.resolve(errorResult.ok(clone(input.job)));
		},
		claimDueWork(input) {
			const due = [...state.workItems.values()]
				.filter(
					(item) =>
						(item.status === "pending" && item.nextAttemptAt <= input.now) ||
						(item.status === "processing" &&
							item.leaseExpiresAt !== null &&
							item.leaseExpiresAt <= input.now),
				)
				.sort((left, right) => {
					const time =
						left.nextAttemptAt.getTime() - right.nextAttemptAt.getTime();
					return time === 0 ? left.id.localeCompare(right.id) : time;
				})
				.slice(0, input.limit);
			const claimed: PayrollJobWorkItem[] = [];
			for (const item of due) {
				const updated: PayrollJobWorkItem = {
					...item,
					status: "processing",
					leaseOwner: input.workerId,
					leaseExpiresAt: input.leaseExpiresAt,
					version: item.version + 1,
					updatedAt: input.now,
				};
				state.workItems.set(item.id, updated);
				claimed.push(clone(updated));
			}
			return Promise.resolve(errorResult.ok(claimed));
		},
		saveJobProgress(input) {
			const currentJob = state.jobs.get(input.job.id);
			const currentWork = state.workItems.get(input.workItem.id);
			if (
				currentJob === undefined ||
				currentWork === undefined ||
				currentJob.organizationId !== input.job.organizationId ||
				currentWork.organizationId !== input.workItem.organizationId ||
				currentJob.version !== input.expectedJobVersion ||
				currentWork.version !== input.expectedWorkVersion ||
				input.job.version !== input.expectedJobVersion + 1 ||
				input.workItem.version !== input.expectedWorkVersion + 1
			) {
				return Promise.resolve(
					errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
					}),
				);
			}
			if (
				input.successorWorkItem !== null &&
				state.workItems.has(input.successorWorkItem.id)
			) {
				return Promise.resolve(
					errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
					}),
				);
			}
			state.jobs.set(input.job.id, clone(input.job));
			state.workItems.set(input.workItem.id, clone(input.workItem));
			if (input.successorWorkItem !== null) {
				state.workItems.set(
					input.successorWorkItem.id,
					clone(input.successorWorkItem),
				);
			}
			if (input.deadLetter !== null) {
				state.deadLetters.set(input.deadLetter.id, clone(input.deadLetter));
			}
			return Promise.resolve(errorResult.ok(clone(input.job)));
		},
		listDeadLetters(input) {
			return Promise.resolve(
				errorResult.ok(
					[...state.deadLetters.values()]
						.filter(
							(entry) =>
								entry.organizationId === input.organizationId &&
								(input.jobId === undefined || entry.jobId === input.jobId),
						)
						.map(clone),
				),
			);
		},
		getDeadLetter(input) {
			const deadLetter = state.deadLetters.get(input.deadLetterId);
			return Promise.resolve(
				errorResult.ok(
					deadLetter?.organizationId === input.organizationId
						? clone(deadLetter)
						: null,
				),
			);
		},
	};
}
