import { ok } from "@afenda/errors/result";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import type { HumanResourcesAuthorizationPort } from "../src/authorization";
import {
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_CREATE,
	HUMAN_RESOURCES_QUERY_HEADCOUNT_PLAN_GET,
} from "../src/module-ids";
import {
	HUMAN_RESOURCES_PERMISSION_WORKFORCE_PLAN_PREPARE,
	HUMAN_RESOURCES_PERMISSION_WORKFORCE_PLAN_READ,
} from "../src/permissions";
import {
	runWorkforcePlanningCommand,
	runWorkforcePlanningQuery,
} from "../src/shared/workforce-planning-command";
import { createMemoryHumanResourcesStore } from "../src/testing";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

const inputSchema = z.object({
	organizationId: z.string().min(1),
	actorUserId: z.string().min(1),
	correlationId: z.string().min(1),
	planId: z.string().min(1).optional(),
});

function authorizationFor(
	permissions: ReadonlySet<string>,
	organizationId = "org-wfp-auth",
): HumanResourcesAuthorizationPort {
	return {
		async can(input) {
			return (
				input.organizationId === organizationId &&
				permissions.has(input.permission)
			);
		},
	};
}

function options(authorization: HumanResourcesAuthorizationPort) {
	return {
		store: createMemoryHumanResourcesStore(),
		ports: createMemoryMutationPorts(),
		authorization,
	};
}

describe("workforce planning authorization enforcement", () => {
	it("authorizes a real organization-scoped read and removes employee actuals", async () => {
		const result = await runWorkforcePlanningQuery(
			{
				organizationId: "org-wfp-auth",
				actorUserId: "planner-1",
				correlationId: "corr-wfp-read",
				planId: "plan-1",
			},
			options(
				authorizationFor(
					new Set([HUMAN_RESOURCES_PERMISSION_WORKFORCE_PLAN_READ]),
				),
			),
			{
				schema: inputSchema,
				invalidMessage: "Invalid workforce planning authorization input",
				query: HUMAN_RESOURCES_QUERY_HEADCOUNT_PLAN_GET,
				execute: async () =>
					ok({
						id: "plan-1",
						status: "approved",
						employeeActuals: [{ employeeId: "employee-1", fte: "1.0000" }],
						actualEmployeeIds: ["employee-1"],
					}),
			},
		);

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toMatchObject({ id: "plan-1", status: "approved" });
		expect(result.data).not.toHaveProperty("employeeActuals");
		expect(result.data).not.toHaveProperty("actualEmployeeIds");
	});

	it("does not let read permission execute a prepare command", async () => {
		const execute = vi.fn(async () => ok({ id: "plan-1" }));
		const result = await runWorkforcePlanningCommand(
			{
				organizationId: "org-wfp-auth",
				actorUserId: "reader-1",
				correlationId: "corr-wfp-command",
			},
			options(
				authorizationFor(
					new Set([HUMAN_RESOURCES_PERMISSION_WORKFORCE_PLAN_READ]),
				),
			),
			{
				schema: inputSchema,
				invalidMessage: "Invalid workforce planning authorization input",
				command: HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_CREATE,
				execute,
			},
		);

		expect(result.ok).toBe(false);
		expect(execute).not.toHaveBeenCalled();
	});

	it("does not carry a planner grant across organizations", async () => {
		const execute = vi.fn(async () => ok({ id: "plan-foreign" }));
		const result = await runWorkforcePlanningQuery(
			{
				organizationId: "org-wfp-foreign",
				actorUserId: "planner-1",
				correlationId: "corr-wfp-foreign",
				planId: "plan-foreign",
			},
			options(
				authorizationFor(
					new Set([
						HUMAN_RESOURCES_PERMISSION_WORKFORCE_PLAN_READ,
						HUMAN_RESOURCES_PERMISSION_WORKFORCE_PLAN_PREPARE,
					]),
				),
			),
			{
				schema: inputSchema,
				invalidMessage: "Invalid workforce planning authorization input",
				query: HUMAN_RESOURCES_QUERY_HEADCOUNT_PLAN_GET,
				execute,
			},
		);

		expect(result.ok).toBe(false);
		expect(execute).not.toHaveBeenCalled();
	});
});
