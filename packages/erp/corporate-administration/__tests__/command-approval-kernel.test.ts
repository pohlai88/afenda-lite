import { createMemoryCorporateAdministrationObservabilityPort } from "@afenda/corporate-administration/testing";
import { errorResult, type Result } from "@afenda/errors";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import type { CorporateAdministrationApprovalDecisionPort } from "../src/authorization";
import type { CorporateAdministrationCommandOptions } from "../src/command-options";
import {
	authorizeCorporateAdministrationCommand,
	executeCorporateAdministrationCommand,
} from "../src/internal/durable-command";
import {
	approvalDecisionIdSchema,
	approvalRequestIdSchema,
	userIdSchema,
} from "../src/kernel/brands";
import type { CorporateAdministrationCommandId } from "../src/operation-registry/registry";
import { createFixedCorporateAdministrationClock } from "./helpers/fixed-clock";
import { createInlineCorporateAdministrationTransactionPort } from "./helpers/inline-transaction";
import { caCommandOptions } from "./helpers/legal-company-test-kit";
import { createMemoryCorporateAdministrationAuditFactPort } from "./helpers/memory-audit";
import { createMemoryCorporateAdministrationIdempotencyPort } from "./helpers/memory-idempotency";
import { createMemoryCorporateAdministrationOutboxPort } from "./helpers/memory-outbox";

const probeInputSchema = z.object({ probe: z.string() }).strict();
const probeOutputSchema = z
	.object({ id: z.string(), version: z.number().int().positive() })
	.strict();
const approvalRequestId = approvalRequestIdSchema.parse(
	"00000000-0000-4000-8000-000000000901",
);
const approvalDecisionId = approvalDecisionIdSchema.parse(
	"00000000-0000-4000-8000-000000000902",
);
const approverUserId = userIdSchema.parse("user-ca-kernel-approver");

describe("Corporate Administration command approval kernel", () => {
	it("executes optional-approval operations when no verifier is configured", async () => {
		const work = vi.fn(async () => errorResult.ok(probeResult()));

		const result = await executeProbe({
			operationId: "addCompanyName",
			work,
		});

		expect(result.ok).toBe(true);
		expect(work).toHaveBeenCalledOnce();
	});

	it("fails configured optional approval when binding identifiers are absent", async () => {
		const work = vi.fn(async () => errorResult.ok(probeResult()));

		const result = await executeProbe({
			operationId: "addCompanyName",
			approvalDecisions: approvingDecisionPort(),
			work,
		});

		expect(result).toMatchObject({ ok: false, code: "FORBIDDEN" });
		expect(work).not.toHaveBeenCalled();
	});

	it("fails required approval when the verifier is absent", async () => {
		const work = vi.fn(async () => errorResult.ok(probeResult()));

		const result = await executeProbe({
			operationId: "activateLegalCompany",
			options: approvalOptions(),
			work,
		});

		expect(result).toMatchObject({ ok: false, code: "FORBIDDEN" });
		expect(work).not.toHaveBeenCalled();
	});

	it("binds approval to tenant, decision, fingerprint and a different actor", async () => {
		const work = vi.fn(async () => errorResult.ok(probeResult()));
		const options = approvalOptions();
		const approvalDecisions = approvingDecisionPort();

		const result = await executeProbe({
			operationId: "activateLegalCompany",
			options,
			approvalDecisions,
			work,
		});

		expect(result.ok).toBe(true);
		expect(approvalDecisions.verify).toHaveBeenCalledOnce();
		expect(work).toHaveBeenCalledOnce();
	});

	it("rejects maker-checker decisions made by the command actor", async () => {
		const work = vi.fn(async () => errorResult.ok(probeResult()));
		const options = approvalOptions();

		const result = await executeProbe({
			operationId: "activateLegalCompany",
			options,
			approvalDecisions: approvingDecisionPort(options.actorUserId),
			work,
		});

		expect(result).toMatchObject({ ok: false, code: "FORBIDDEN" });
		expect(work).not.toHaveBeenCalled();
	});

	it("enforces approval only when the resolved statutory office is protected", async () => {
		const unprotectedWork = vi.fn(async () => errorResult.ok(probeResult()));
		const protectedWork = vi.fn(async () => errorResult.ok(probeResult()));

		const unprotected = await executeProbe({
			operationId: "appointOfficer",
			approvalRequirement: "not_required",
			work: unprotectedWork,
		});
		const protectedResult = await executeProbe({
			operationId: "appointOfficer",
			approvalRequirement: "required",
			options: approvalOptions(),
			work: protectedWork,
		});

		expect(unprotected.ok).toBe(true);
		expect(unprotectedWork).toHaveBeenCalledOnce();
		expect(protectedResult).toMatchObject({
			ok: false,
			code: "FORBIDDEN",
		});
		expect(protectedWork).not.toHaveBeenCalled();
	});

	it("rejects a missing domain decision for conditional approval policy", async () => {
		await expect(
			executeProbe({
				operationId: "appointOfficer",
				work: async () => errorResult.ok(probeResult()),
			}),
		).rejects.toThrow("protected-role approval requirement is missing");
	});
});

async function executeProbe(input: {
	operationId: CorporateAdministrationCommandId;
	options?: CorporateAdministrationCommandOptions | undefined;
	approvalRequirement?: "required" | "not_required" | undefined;
	approvalDecisions?: CorporateAdministrationApprovalDecisionPort | undefined;
	work: () => Promise<Result<ReturnType<typeof probeResult>>>;
}) {
	const options = input.options ?? caCommandOptions();
	const authorization = await authorizeCorporateAdministrationCommand(
		input.operationId,
		options,
	);
	if (!authorization.ok) {
		return authorization;
	}
	return executeCorporateAdministrationCommand({
		authorization: authorization.data,
		fingerprintSchema: probeInputSchema,
		fingerprintInput: { probe: input.operationId },
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
				observability: createMemoryCorporateAdministrationObservabilityPort(),
			},
			createEventId: () => "00000000-0000-4000-8000-000000000903",
			...(input.approvalDecisions === undefined
				? {}
				: { approvalDecisions: input.approvalDecisions }),
		},
		...(input.approvalRequirement === undefined
			? {}
			: { approvalRequirement: input.approvalRequirement }),
		event: {
			operationType: "UPDATE",
			targetType: "ca_legal_company",
			aggregateId: (result) => result.id,
			aggregateVersion: (result) => result.version,
			payload: () => ({}),
		},
		work: input.work,
	});
}

function approvalOptions(): CorporateAdministrationCommandOptions & {
	approvalRequestId: typeof approvalRequestId;
	approvalDecisionId: typeof approvalDecisionId;
} {
	return {
		...caCommandOptions(),
		approvalRequestId,
		approvalDecisionId,
	};
}

function approvingDecisionPort(
	approver = approverUserId,
): CorporateAdministrationApprovalDecisionPort {
	return {
		verify: vi.fn(async (input) =>
			errorResult.ok({
				...input,
				approved: true,
				approverUserId: approver,
			}),
		),
	};
}

function probeResult() {
	return { id: "ca-kernel-probe", version: 1 };
}
