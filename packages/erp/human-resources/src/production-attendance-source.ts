import type { ErrorCode } from "@afenda/errors";
import { fail, ok, type Result } from "@afenda/errors/result";

import {
	HUMAN_RESOURCES_ERROR_DEPENDENCY_UNAVAILABLE,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	humanResourcesErrorDetails,
} from "./error-codes";
import {
	bindAttendanceConnectorCursor,
	resolveAttendanceConnectorPullCursor,
} from "./time/attendance/connector-cursor";
import { buildAttendanceConnectorArtifacts } from "./time/attendance/connector-validation";
import type {
	AttendanceConnectorPullPort,
	AttendanceSourceBatch,
	AttendanceSourceEvent,
	AttendanceSourcePort,
	AttendanceSourcePreviewResult,
} from "./time/handoff/ports";

const DEFAULT_RETRY = {
	maxAttempts: 3,
	backoffMs: 0,
} as const;

const RETRYABLE_PULL_CODES = new Set<ErrorCode>([
	"INTERNAL_ERROR",
	"SERVICE_UNAVAILABLE",
]);

function isRetryablePullFailure(result: {
	ok: false;
	code: ErrorCode;
}): boolean {
	return RETRYABLE_PULL_CODES.has(result.code);
}

async function sleep(ms: number): Promise<void> {
	if (ms <= 0) {
		return;
	}
	await new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

async function pullWithRetry(input: {
	pull: AttendanceConnectorPullPort;
	organizationId: string;
	pullCursor?: string;
	retry: { maxAttempts: number; backoffMs: number };
}): Promise<
	Result<{
		events: readonly AttendanceSourceEvent[];
		nextCursor?: string;
	}>
> {
	let lastFailure: Result<never> | undefined;

	for (let attempt = 1; attempt <= input.retry.maxAttempts; attempt += 1) {
		try {
			const pulled = await input.pull.pull({
				organizationId: input.organizationId,
				cursor: input.pullCursor,
			});
			if (pulled.ok) {
				return pulled;
			}
			lastFailure = pulled;
			if (
				!isRetryablePullFailure(pulled) ||
				attempt === input.retry.maxAttempts
			) {
				return pulled;
			}
		} catch {
			lastFailure = fail(
				"SERVICE_UNAVAILABLE",
				"Attendance connector request failed.",
				humanResourcesErrorDetails(
					HUMAN_RESOURCES_ERROR_DEPENDENCY_UNAVAILABLE,
				),
			);
			if (attempt === input.retry.maxAttempts) {
				return lastFailure;
			}
		}

		await sleep(input.retry.backoffMs * attempt);
	}

	return (
		lastFailure ??
		fail(
			"SERVICE_UNAVAILABLE",
			"Attendance connector request failed.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_DEPENDENCY_UNAVAILABLE),
		)
	);
}

function requireOrganizationId(organizationId: string): Result<void> {
	if (organizationId.trim().length === 0) {
		return fail(
			"VALIDATION_ERROR",
			"Organization id is required for attendance connector pulls.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	return ok(undefined);
}

function failClosedAttendanceSource(): AttendanceSourcePort {
	const unavailable = (): Promise<Result<never>> =>
		Promise.resolve(
			fail(
				"CONFLICT",
				"Pass inline import events or configure an attendance connector.",
				humanResourcesErrorDetails(
					HUMAN_RESOURCES_ERROR_DEPENDENCY_UNAVAILABLE,
				),
			),
		);

	return {
		fetchEvents: unavailable,
		previewEvents: unavailable,
	};
}

async function pullNormalizedBatch(input: {
	pull: AttendanceConnectorPullPort;
	organizationId: string;
	cursor?: string;
	retry: { maxAttempts: number; backoffMs: number };
}): Promise<
	Result<{
		batch: AttendanceSourceBatch;
		preview: AttendanceSourcePreviewResult;
	}>
> {
	const organization = requireOrganizationId(input.organizationId);
	if (!organization.ok) {
		return organization;
	}

	const resolvedCursor = resolveAttendanceConnectorPullCursor({
		organizationId: input.organizationId,
		cursor: input.cursor,
	});
	if (!resolvedCursor.ok) {
		return resolvedCursor;
	}

	const pulled = await pullWithRetry({
		pull: input.pull,
		organizationId: input.organizationId,
		pullCursor: resolvedCursor.data.pullCursor,
		retry: input.retry,
	});
	if (!pulled.ok) {
		return pulled;
	}

	const boundCursor = bindAttendanceConnectorCursor({
		organizationId: input.organizationId,
		nextToken: pulled.data.nextCursor,
	});
	const artifacts = buildAttendanceConnectorArtifacts({
		organizationId: input.organizationId,
		cursor: input.cursor,
		events: pulled.data.events,
		nextCursor: boundCursor,
	});

	return ok({
		batch: {
			events: artifacts.batch.events,
			nextCursor: artifacts.batch.nextCursor,
			rejectedRows:
				artifacts.batch.rejectedRows.length > 0
					? artifacts.batch.rejectedRows
					: undefined,
		},
		preview: artifacts.preview,
	});
}

function createConfiguredAttendanceSource(input: {
	pull: AttendanceConnectorPullPort;
	retry: { maxAttempts: number; backoffMs: number };
}): AttendanceSourcePort {
	const resolve = (fetchInput: { organizationId: string; cursor?: string }) =>
		pullNormalizedBatch({
			pull: input.pull,
			organizationId: fetchInput.organizationId,
			cursor: fetchInput.cursor,
			retry: input.retry,
		});

	return {
		async fetchEvents(fetchInput) {
			const resolved = await resolve(fetchInput);
			if (!resolved.ok) {
				return resolved;
			}
			return ok(resolved.data.batch);
		},
		async previewEvents(fetchInput) {
			const resolved = await resolve(fetchInput);
			if (!resolved.ok) {
				return resolved;
			}
			return ok(resolved.data.preview);
		},
	};
}

/**
 * Composition-root attendance source for external import pulls.
 * Inline import events bypass this port; connector integrations replace this factory.
 */
export function createProductionAttendanceSource(deps?: {
	pull?: AttendanceConnectorPullPort;
	retry?: { maxAttempts: number; backoffMs: number };
}): AttendanceSourcePort {
	if (deps?.pull === undefined) {
		return failClosedAttendanceSource();
	}

	return createConfiguredAttendanceSource({
		pull: deps.pull,
		retry: deps.retry ?? DEFAULT_RETRY,
	});
}

export type {
	AttendanceConnectorPullPort,
	AttendanceSourcePreviewResult,
} from "./time/handoff/ports";
