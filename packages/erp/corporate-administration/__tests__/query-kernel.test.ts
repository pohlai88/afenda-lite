import { errorResult, type Result } from "@afenda/errors";
import { describe, expect, it, vi } from "vitest";

import { executeCorporateAdministrationQuery } from "../src/internal/query";
import type { CorporateAdministrationOperationObservation } from "../src/ports";
import { caQueryOptions } from "./helpers/legal-company-test-kit";

describe("Corporate Administration query kernel", () => {
	it("derives authorization and a success observation from the registry", async () => {
		const observations: CorporateAdministrationOperationObservation[] = [];
		const authorization = vi.fn(async () => true);
		const work = vi.fn(async () => errorResult.ok({ id: "company-1" }));
		const options = {
			...caQueryOptions(),
			authorization: { can: authorization },
		};

		const result = await executeCorporateAdministrationQuery({
			operationId: "getLegalCompany",
			options,
			dependencies: observer(observations),
			work,
		});

		expect(result).toEqual(errorResult.ok({ id: "company-1" }));
		expect(authorization).toHaveBeenCalledWith({
			organizationId: options.organizationId,
			actorUserId: options.actorUserId,
			permission: "corporate_administration.company.read",
		});
		expect(work).toHaveBeenCalledOnce();
		expect(observations).toEqual([
			{
				operationId: "getLegalCompany",
				kind: "query",
				owner: "company",
				observabilityClass: "corporate_administration_operation",
				correlationId: options.correlationId,
				outcome: "success",
			},
		]);
	});

	it("fails closed before work and records the canonical failure", async () => {
		const observations: CorporateAdministrationOperationObservation[] = [];
		const work = vi.fn(async () => errorResult.ok({ id: "not-readable" }));

		const result = await executeCorporateAdministrationQuery({
			operationId: "getLegalCompany",
			options: caQueryOptions({ allowed: false }),
			dependencies: observer(observations),
			work,
		});

		expect(result).toMatchObject({ ok: false, code: "FORBIDDEN" });
		expect(work).not.toHaveBeenCalled();
		expect(observations).toEqual([
			expect.objectContaining({
				operationId: "getLegalCompany",
				kind: "query",
				outcome: "failure",
				errorCode: "FORBIDDEN",
			}),
		]);
	});

	it("records a redacted exception before preserving rejection semantics", async () => {
		const observations: CorporateAdministrationOperationObservation[] = [];
		const work = vi.fn(
			(): Promise<Result<never>> =>
				Promise.reject(new Error("sensitive database detail")),
		);
		const options = caQueryOptions();

		await expect(
			executeCorporateAdministrationQuery({
				operationId: "getLegalCompany",
				options,
				dependencies: observer(observations),
				work,
			}),
		).rejects.toThrow("sensitive database detail");
		expect(observations).toEqual([
			{
				operationId: "getLegalCompany",
				kind: "query",
				owner: "company",
				observabilityClass: "corporate_administration_operation",
				correlationId: options.correlationId,
				outcome: "exception",
			},
		]);
		expect(JSON.stringify(observations)).not.toContain("sensitive");
	});
});

function observer(observations: CorporateAdministrationOperationObservation[]) {
	return {
		runtime: {
			observability: {
				recordOperation(
					observation: CorporateAdministrationOperationObservation,
				) {
					observations.push(observation);
				},
			},
		},
	};
}
