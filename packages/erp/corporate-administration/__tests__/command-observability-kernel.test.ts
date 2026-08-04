import { errorResult, type Result } from "@afenda/errors";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { CorporateAdministrationOperationObservation } from "../src/kernel/execution/ports";
import {
	authorizeCorporateAdministrationCommand,
	executeCorporateAdministrationCommand,
} from "../src/kernel/internal/durable-command";
import { createFixedCorporateAdministrationClock } from "./helpers/fixed-clock";
import { createInlineCorporateAdministrationTransactionPort } from "./helpers/inline-transaction";
import { caCommandOptions } from "./helpers/legal-company-test-kit";
import { createMemoryCorporateAdministrationAuditFactPort } from "./helpers/memory-audit";
import { createMemoryCorporateAdministrationIdempotencyPort } from "./helpers/memory-idempotency";
import { createMemoryCorporateAdministrationOutboxPort } from "./helpers/memory-outbox";

const probeInputSchema = z.object({ probe: z.string().min(1) }).strict();
const probeOutputSchema = z
	.object({ id: z.string(), version: z.number().int().positive() })
	.strict();
const probeOptions = caCommandOptions();

describe("Corporate Administration command observability kernel", () => {
	it("emits one registry-derived success observation", async () => {
		const observations: CorporateAdministrationOperationObservation[] = [];
		const result = await executeProbe({
			observations,
			work: async () => errorResult.ok(probeResult()),
		});

		expect(result.ok).toBe(true);
		expect(observations).toEqual([
			{
				operationId: "registerLegalCompanyDraft",
				kind: "command",
				owner: "company",
				observabilityClass: "corporate_administration_operation",
				correlationId: probeOptions.correlationId,
				outcome: "success",
			},
		]);
	});

	it("emits the canonical error code for governed failures", async () => {
		const observations: CorporateAdministrationOperationObservation[] = [];
		const result = await executeProbe({
			observations,
			work: async () => errorResult.fail("CONFLICT"),
		});

		expect(result).toMatchObject({ ok: false, code: "CONFLICT" });
		expect(observations).toEqual([
			expect.objectContaining({
				operationId: "registerLegalCompanyDraft",
				outcome: "failure",
				errorCode: "CONFLICT",
			}),
		]);
	});

	it("emits a redacted exception observation before rethrowing", async () => {
		const observations: CorporateAdministrationOperationObservation[] = [];
		const work = vi.fn(
			(): Promise<Result<ReturnType<typeof probeResult>>> =>
				Promise.reject(new Error("sensitive infrastructure detail")),
		);

		await expect(executeProbe({ observations, work })).rejects.toThrow(
			"sensitive infrastructure detail",
		);
		expect(observations).toEqual([
			{
				operationId: "registerLegalCompanyDraft",
				kind: "command",
				owner: "company",
				observabilityClass: "corporate_administration_operation",
				correlationId: probeOptions.correlationId,
				outcome: "exception",
			},
		]);
		expect(JSON.stringify(observations)).not.toContain("sensitive");
	});
});

async function executeProbe(input: {
	observations: CorporateAdministrationOperationObservation[];
	work: () => Promise<Result<ReturnType<typeof probeResult>>>;
}) {
	const authorization = await authorizeCorporateAdministrationCommand(
		"registerLegalCompanyDraft",
		probeOptions,
	);
	if (!authorization.ok) {
		return authorization;
	}
	return executeCorporateAdministrationCommand({
		authorization: authorization.data,
		fingerprintSchema: probeInputSchema,
		fingerprintInput: { probe: "observability" },
		outputSchema: probeOutputSchema,
		dependencies: {
			runtime: {
				clock: createFixedCorporateAdministrationClock(
					"2026-08-02T00:00:00.000Z",
				),
				transaction: createInlineCorporateAdministrationTransactionPort(),
				idempotency: createMemoryCorporateAdministrationIdempotencyPort(),
				audit: createMemoryCorporateAdministrationAuditFactPort(),
				outbox: createMemoryCorporateAdministrationOutboxPort(),
				observability: {
					recordOperation(observation) {
						input.observations.push(observation);
					},
				},
			},
			createEventId: () => "00000000-0000-4000-8000-000000000904",
		},
		event: {
			operationType: "CREATE",
			targetType: "ca_legal_company",
			aggregateId: (result) => result.id,
			aggregateVersion: (result) => result.version,
			payload: () => ({}),
		},
		work: input.work,
	});
}

function probeResult() {
	return { id: "ca-observability-probe", version: 1 };
}
