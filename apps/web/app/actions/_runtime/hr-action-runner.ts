import {
	type Result as ActionResult,
	errorResult,
	type Result,
} from "@afenda/errors";
import type { HrObservabilityArea } from "@afenda/human-resources";
import type { z } from "zod";

import { withHrSessionContext } from "@/app/actions/hr-mutation-context";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { createHrOperatorPermissionActionRunner } from "@/app/actions/_runtime/run-hr-operator-permission-action";
import { createHumanResourcesCommandOptions } from "@/lib/erp/human-resources-command-options";
import type { ProductPermissionCode } from "@/modules/identity/domain/session-permission";

import { parseSchema } from "@/modules/platform/schemas/common";

interface HrHumanResourcesActionConfig<
	TData,
	TPayload extends Record<string, unknown>,
> {
	actionSchema: z.ZodTypeAny;
	input: unknown;
	invoke: (stampedInput: Record<string, unknown>) => Promise<Result<TData>>;
	mapData: (data: TData) => TPayload;
	path: string;
	permission: ProductPermissionCode;
	safeMessage: string;
	validationMessage: string;
}

function createHrHumanResourcesActionRunner(area: HrObservabilityArea) {
	const runOperatorPermissionAction =
		createHrOperatorPermissionActionRunner(area);
	return async function runAreaHumanResourcesAction<
		TData,
		TPayload extends Record<string, unknown>,
	>(
		config: HrHumanResourcesActionConfig<TData, TPayload>,
	): Promise<ActionResult<TPayload>> {
		return await runHrHumanResourcesAction(config, runOperatorPermissionAction);
	};
}

/** Shared HR Server Action envelope: permission gate → Zod → session stamp → package delegate. */
export async function runHrHumanResourcesAction<
	TData,
	TPayload extends Record<string, unknown>,
>(
	config: HrHumanResourcesActionConfig<TData, TPayload>,
	runOperatorPermissionAction: ReturnType<
		typeof createHrOperatorPermissionActionRunner
	>,
): Promise<ActionResult<TPayload>> {
	return await runOperatorPermissionAction({
		path: config.path,
		permission: config.permission,
		safeMessage: config.safeMessage,
		execute: async (session, correlationId) => {
			const parsed = parseSchema(config.actionSchema, config.input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "The submitted data is invalid",
				});
			}
			const stamped = withHrSessionContext(
				session,
				correlationId,
				parsed.data as Record<string, unknown>,
			);
			const result = await config.invoke(stamped);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: config.mapData(mapped.data) };
		},
	});
}

export const runHrCompensationHumanResourcesAction =
	createHrHumanResourcesActionRunner("compensation");
export const runHrComplianceHumanResourcesAction =
	createHrHumanResourcesActionRunner("compliance");
export const runHrWorkforceHumanResourcesAction =
	createHrHumanResourcesActionRunner("workforce");

type HrPackageFunction<TData> = (
	input: unknown,
	options: ReturnType<typeof createHumanResourcesCommandOptions>,
) => Promise<Result<TData>>;

export function invokeHrPackage<TData>(packageFn: HrPackageFunction<TData>) {
	return (stampedInput: Record<string, unknown>) =>
		packageFn(stampedInput, createHumanResourcesCommandOptions());
}
