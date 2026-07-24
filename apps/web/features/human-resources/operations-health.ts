import type { EventPage, EventStatus } from "@afenda/events";

type QueuePage = EventPage | null;

export type HrQueueHealth = {
	pending: number;
	failed: number;
	processed: number;
	stalePending: number;
	sloHealthy: boolean;
	reconciliationIssues: string[];
};

function reconcilePage(page: QueuePage, expectedStatus: EventStatus): string[] {
	if (page === null) return [`${expectedStatus} queue could not be read`];
	const issues: string[] = [];
	if (page.total < page.entries.length) {
		issues.push(
			`${expectedStatus} queue total is smaller than the returned page`,
		);
	}
	if (
		page.entries.some(
			(event) =>
				event.sourceModule !== "human-resources" ||
				event.status !== expectedStatus,
		)
	) {
		issues.push(`${expectedStatus} queue contains a cross-boundary event`);
	}
	return issues;
}

export function reconcileHrQueueHealth(input: {
	pending: QueuePage;
	failed: QueuePage;
	processed: QueuePage;
	stalePending: QueuePage;
}): HrQueueHealth {
	const pending = input.pending?.total ?? 0;
	const failed = input.failed?.total ?? 0;
	const processed = input.processed?.total ?? 0;
	const stalePending = input.stalePending?.total ?? 0;
	const reconciliationIssues = [
		...reconcilePage(input.pending, "pending"),
		...reconcilePage(input.failed, "failed"),
		...reconcilePage(input.processed, "processed"),
		...reconcilePage(input.stalePending, "pending"),
	];

	return {
		pending,
		failed,
		processed,
		stalePending,
		sloHealthy:
			failed === 0 &&
			pending <= 10 &&
			stalePending === 0 &&
			reconciliationIssues.length === 0,
		reconciliationIssues,
	};
}
