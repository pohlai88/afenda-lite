import { fail, ok, type Result } from "@afenda/errors/result";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { HUMAN_RESOURCES_COMMAND_PERSON_CREATE } from "../src/module-ids";
import {
	createMemoryHrObservabilityRecorder,
	type HrObservabilityPorts,
	observeHrPrivacyOperationResult,
	recordHrAuthorizationDenial,
	recordHrBulkError,
	recordHrCommand,
	recordHrConnectorHealth,
	recordHrEventFailure,
	recordHrOutboxLag,
	recordHrParityFailure,
	recordHrPayrollDeliveryFailure,
	recordHrPrivacyOperation,
} from "../src/observability";
import { runParsedAuthorizedCommand } from "../src/shared/domain-runner";

function createHarness() {
	const recorder = createMemoryHrObservabilityRecorder();
	const ports: HrObservabilityPorts = {
		recorder,
		clock: { now: () => new Date("2026-01-01T00:00:00.000Z") },
	};
	return { recorder, ports };
}

describe("HR observability vocabulary", () => {
	it("records command count and duration with fixed low-cardinality labels", async () => {
		const { recorder, ports } = createHarness();
		await recordHrCommand(
			{ area: "workforce", outcome: "success", durationMs: 12.5 },
			ports,
		);
		await recordHrCommand(
			{
				area: "leave",
				outcome: "failure",
				durationMs: 8,
				failureReason: "validation",
			},
			ports,
		);
		expect(recorder.metrics).toEqual([
			{
				name: "hr.command.total",
				kind: "counter",
				value: 1,
				labels: { area: "workforce", outcome: "success" },
			},
			{
				name: "hr.command.duration_ms",
				kind: "histogram",
				value: 12.5,
				labels: { area: "workforce", outcome: "success" },
			},
			{
				name: "hr.command.total",
				kind: "counter",
				value: 1,
				labels: { area: "leave", outcome: "failure" },
			},
			{
				name: "hr.command.duration_ms",
				kind: "histogram",
				value: 8,
				labels: { area: "leave", outcome: "failure" },
			},
		]);
		expect(recorder.events).toEqual([
			{
				name: "hr.command.failed",
				severity: "error",
				observedAt: new Date("2026-01-01T00:00:00.000Z"),
				attributes: { area: "leave", reason: "validation" },
			},
		]);
	});

	it("rejects invalid duration and incomplete failure semantics", async () => {
		const { ports } = createHarness();
		await expect(
			recordHrCommand(
				{ area: "time", outcome: "success", durationMs: Number.NaN },
				ports,
			),
		).rejects.toThrow("non-negative finite");
		await expect(
			recordHrCommand(
				{ area: "time", outcome: "failure", durationMs: 1 },
				ports,
			),
		).rejects.toThrow("failure reason");
	});

	it("covers authorization, privacy, outbox, event, parity, connector, bulk, and payroll signals", async () => {
		const { recorder, ports } = createHarness();
		await recordHrAuthorizationDenial(
			{ area: "talent", reason: "sensitive_scope_missing" },
			ports,
		);
		await recordHrPrivacyOperation(
			{ operation: "export", outcome: "failure", failureReason: "persistence" },
			ports,
		);
		await recordHrOutboxLag({ eventFamily: "domain_event", lagMs: 250 }, ports);
		await recordHrEventFailure(
			{ eventFamily: "payroll_handoff", reason: "contract" },
			ports,
		);
		await recordHrParityFailure(
			{ area: "compliance", adapter: "drizzle" },
			ports,
		);
		await recordHrConnectorHealth(
			{ connector: "payroll", health: "degraded" },
			ports,
		);
		await recordHrBulkError({ stage: "apply", reason: "conflict" }, ports);
		await recordHrPayrollDeliveryFailure(
			{ stage: "publish", reason: "timeout" },
			ports,
		);

		expect(recorder.metrics.map((metric) => metric.name)).toEqual([
			"hr.authorization.denial.total",
			"hr.privacy.operation.total",
			"hr.outbox.lag_ms",
			"hr.event.failure.total",
			"hr.parity.failure.total",
			"hr.connector.health",
			"hr.bulk.error.total",
			"hr.payroll_delivery.failure.total",
		]);
		expect(recorder.events.map((event) => event.name)).toEqual([
			"hr.authorization.denied",
			"hr.privacy.operation.failed",
			"hr.event.failed",
			"hr.parity.failed",
			"hr.connector.unhealthy",
			"hr.bulk.failed",
			"hr.payroll_delivery.failed",
		]);
		expect(
			recorder.metrics.find((metric) => metric.name === "hr.connector.health"),
		).toMatchObject({ value: 0.5, labels: { connector: "payroll" } });
	});

	it("emits no identifier, free-text message, secret, or PII label fields", async () => {
		const { recorder, ports } = createHarness();
		await recordHrPayrollDeliveryFailure(
			{ stage: "correction", reason: "contract" },
			ports,
		);
		await recordHrAuthorizationDenial(
			{ area: "compensation", reason: "tenant_mismatch" },
			ports,
		);
		const serialized = JSON.stringify({
			metrics: recorder.metrics,
			events: recorder.events,
		});
		for (const forbidden of [
			"organizationId",
			"correlationId",
			"employeeId",
			"userId",
			"email",
			"payload",
			"secret",
			"token",
			"message",
		]) {
			expect(serialized).not.toContain(forbidden);
		}
		for (const observation of recorder.metrics) {
			expect(Object.keys(observation.labels).length).toBeLessThanOrEqual(2);
		}
		for (const event of recorder.events) {
			expect(Object.keys(event.attributes).length).toBeLessThanOrEqual(2);
		}
	});

	it("observes privacy results without changing domain semantics", async () => {
		const { recorder, ports } = createHarness();
		const success: Result<{ reference: string }> = {
			ok: true,
			data: { reference: "subject-export" },
		};
		const failure: Result<never> = {
			ok: false,
			code: "FORBIDDEN",
			message: "Denied",
		};
		expect(
			await observeHrPrivacyOperationResult({
				operation: "export",
				observability: ports,
				result: success,
			}),
		).toBe(success);
		expect(
			await observeHrPrivacyOperationResult({
				operation: "erase",
				observability: ports,
				result: failure,
			}),
		).toBe(failure);
		expect(recorder.metrics).toEqual([
			expect.objectContaining({
				name: "hr.privacy.operation.total",
				labels: { operation: "export", outcome: "success" },
			}),
			expect.objectContaining({
				name: "hr.privacy.operation.total",
				labels: { operation: "erase", outcome: "failure" },
			}),
		]);
		expect(recorder.events).toEqual([
			expect.objectContaining({
				name: "hr.privacy.operation.failed",
				attributes: { operation: "erase", reason: "authorization" },
			}),
		]);
	});

	it("observes validation, dependency, and resource failures before authorization", async () => {
		const { recorder, ports } = createHarness();
		const schema = z.object({
			organizationId: z.string().min(1),
			actorUserId: z.string().min(1),
			mode: z.enum(["dependency", "resource", "success"]),
		});
		const run = (input: unknown) =>
			runParsedAuthorizedCommand(
				input,
				{ observability: ports },
				{
					command: HUMAN_RESOURCES_COMMAND_PERSON_CREATE,
					schema,
					invalidMessage: "Invalid person input",
					resolveDeps: (_options, data) =>
						data.mode === "dependency"
							? fail("SERVICE_UNAVAILABLE", "Dependency unavailable")
							: ok({ dependency: true }),
					resolveResource: (data) =>
						data.mode === "resource"
							? fail("NOT_FOUND", "Resource unavailable")
							: undefined,
					execute: async () => ok({ created: true }),
				},
			);

		expect((await run({})).ok).toBe(false);
		expect(
			(
				await run({
					organizationId: "org-1",
					actorUserId: "user-1",
					mode: "dependency",
				})
			).ok,
		).toBe(false);
		expect(
			(
				await run({
					organizationId: "org-1",
					actorUserId: "user-1",
					mode: "resource",
				})
			).ok,
		).toBe(false);

		expect(
			recorder.metrics
				.filter((metric) => metric.name === "hr.command.total")
				.map((metric) => metric.labels),
		).toEqual([
			{ area: "workforce", outcome: "failure" },
			{ area: "workforce", outcome: "failure" },
			{ area: "workforce", outcome: "failure" },
		]);
		expect(
			recorder.events
				.filter((event) => event.name === "hr.command.failed")
				.map((event) => event.attributes.reason),
		).toEqual(["validation", "unavailable", "not_found"]);
	});
});
