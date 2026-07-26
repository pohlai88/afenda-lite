import type { Result } from "@afenda/errors/result";
import type { z } from "zod";

import { withHrSessionContext } from "@/app/actions/hr-mutation-context";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createHumanResourcesCommandOptions } from "@/lib/erp/human-resources-command-options";
import type { ProductPermissionCode } from "@/modules/identity/domain/session-permission";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

type HrHumanResourcesActionConfig<
	TData,
	TPayload extends Record<string, unknown>,
> = {
	path: string;
	permission: ProductPermissionCode;
	safeMessage: string;
	validationMessage: string;
	actionSchema: z.ZodTypeAny;
	input: unknown;
	invoke: (stampedInput: Record<string, unknown>) => Promise<Result<TData>>;
	mapData: (data: TData) => TPayload;
};

/** Shared HR Server Action envelope: permission gate → Zod → session stamp → package delegate. */
export async function runHrHumanResourcesAction<
	TData,
	TPayload extends Record<string, unknown>,
>(
	config: HrHumanResourcesActionConfig<TData, TPayload>,
): Promise<ActionResult<TPayload>> {
	return runOperatorPermissionAction({
		path: config.path,
		permission: config.permission,
		safeMessage: config.safeMessage,
		execute: async (session, correlationId) => {
			const parsed = parseSchema(config.actionSchema, config.input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					config.validationMessage,
					parsed.details,
				);
			}
			const stamped = withHrSessionContext(
				session,
				correlationId,
				parsed.data as Record<string, unknown>,
			);
			const result = await config.invoke(stamped);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: config.mapData(mapped.data) };
		},
	});
}

type HrPackageFunction<TData> = (
	input: unknown,
	options?: ReturnType<typeof createHumanResourcesCommandOptions>,
) => Promise<Result<TData>>;

export function invokeHrPackage<TData>(packageFn: HrPackageFunction<TData>) {
	return (stampedInput: Record<string, unknown>) =>
		packageFn(stampedInput, createHumanResourcesCommandOptions());
}
