import { channel } from "node:diagnostics_channel";
import { performance } from "node:perf_hooks";

import type { Result } from "@afenda/errors";
import { z } from "zod";

export const AUDIT_TELEMETRY_CHANNEL = "afenda.audit.operation.v1" as const;

export const AUDIT_TELEMETRY_OPERATIONS = [
	"record",
	"query",
	"cursor_query",
	"count",
	"export",
	"purge",
	"transaction_build",
] as const;

export const auditTelemetryEventSchema = z
	.object({
		version: z.literal(1),
		operation: z.enum(AUDIT_TELEMETRY_OPERATIONS),
		outcome: z.enum(["succeeded", "rejected", "failed"]),
		durationMs: z.number().finite().nonnegative(),
		errorCode: z.string().trim().min(1).max(64).optional(),
		rowCount: z.number().int().nonnegative().optional(),
		truncated: z.boolean().optional(),
	})
	.strict();

export type AuditTelemetryEvent = z.infer<typeof auditTelemetryEventSchema>;
export type AuditTelemetryOperation =
	(typeof AUDIT_TELEMETRY_OPERATIONS)[number];

export interface AuditTelemetrySummary {
	readonly rowCount?: number;
	readonly truncated?: boolean;
}

const auditTelemetryChannel = channel(AUDIT_TELEMETRY_CHANNEL);
const REJECTED_ERROR_CODES: ReadonlySet<string> = new Set([
	"BAD_REQUEST",
	"FORBIDDEN",
	"UNAUTHORIZED",
	"VALIDATION_ERROR",
]);

function publishAuditTelemetry(event: AuditTelemetryEvent): void {
	auditTelemetryChannel.publish(auditTelemetryEventSchema.parse(event));
}

function durationSince(startedAt: number): number {
	return Math.max(0, performance.now() - startedAt);
}

function eventForResult<T>(input: {
	operation: AuditTelemetryOperation;
	result: Result<T>;
	startedAt: number;
	summarize?: ((data: T) => AuditTelemetrySummary) | undefined;
}): AuditTelemetryEvent {
	if (!input.result.ok) {
		return {
			version: 1,
			operation: input.operation,
			outcome: REJECTED_ERROR_CODES.has(input.result.code)
				? "rejected"
				: "failed",
			durationMs: durationSince(input.startedAt),
			errorCode: input.result.code,
		};
	}

	return {
		version: 1,
		operation: input.operation,
		outcome: "succeeded",
		durationMs: durationSince(input.startedAt),
		...(input.summarize?.(input.result.data) ?? {}),
	};
}

export function observeAuditOperation<T>(
	operation: AuditTelemetryOperation,
	execute: () => Result<T> | PromiseLike<Result<T>>,
	summarize?: (data: T) => AuditTelemetrySummary,
): Promise<Result<T>> {
	const startedAt = performance.now();
	return Promise.resolve()
		.then(execute)
		.then(
			(result) => {
				publishAuditTelemetry({
					...eventForResult({ operation, result, startedAt, summarize }),
				});
				return result;
			},
			(error: unknown) => {
				publishAuditTelemetry({
					version: 1,
					operation,
					outcome: "failed",
					durationMs: durationSince(startedAt),
					errorCode: "UNEXPECTED_ERROR",
				});
				throw error;
			},
		);
}

export function observeSynchronousAuditOperation<T>(
	operation: AuditTelemetryOperation,
	execute: () => Result<T>,
): Result<T> {
	const startedAt = performance.now();
	try {
		const result = execute();
		publishAuditTelemetry(eventForResult({ operation, result, startedAt }));
		return result;
	} catch (error) {
		publishAuditTelemetry({
			version: 1,
			operation,
			outcome: "failed",
			durationMs: durationSince(startedAt),
			errorCode: "UNEXPECTED_ERROR",
		});
		throw error;
	}
}
