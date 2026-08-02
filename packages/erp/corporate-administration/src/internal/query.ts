import type { Result } from "@afenda/errors";

import { requireCorporateAdministrationPermission } from "../authorization";
import type { CorporateAdministrationQueryOptions } from "../command-options";
import {
	type CorporateAdministrationQueryId,
	getCorporateAdministrationOperationDefinition,
} from "../operation-registry/registry";
import type { CorporateAdministrationRuntimePorts } from "../ports";

export type CorporateAdministrationQueryKernelDependencies = Readonly<{
	runtime: Pick<CorporateAdministrationRuntimePorts, "observability">;
}>;

export type ExecuteCorporateAdministrationQueryInput<TResult> = Readonly<{
	operationId: CorporateAdministrationQueryId;
	options: CorporateAdministrationQueryOptions;
	dependencies: CorporateAdministrationQueryKernelDependencies;
	work: () => Promise<Result<TResult>>;
}>;

/**
 * Private semantic kernel for accepted Corporate Administration queries.
 *
 * Input parsing remains at each domain facade. Once accepted, registry-owned
 * authorization and terminal diagnostics are interpreted exactly once here.
 */
export async function executeCorporateAdministrationQuery<TResult>(
	input: ExecuteCorporateAdministrationQueryInput<TResult>,
): Promise<Result<TResult>> {
	const operation = getCorporateAdministrationOperationDefinition(
		input.operationId,
	);
	let result: Result<TResult>;
	try {
		const authorized = await requireCorporateAdministrationPermission(
			input.options.authorization,
			{
				organizationId: input.options.organizationId,
				actorUserId: input.options.actorUserId,
				permission: operation.permission,
			},
		);
		result = authorized.ok ? await input.work() : authorized;
	} catch (cause: unknown) {
		input.dependencies.runtime.observability.recordOperation({
			operationId: operation.id,
			kind: operation.kind,
			owner: operation.owner,
			observabilityClass: operation.observabilityClass,
			correlationId: input.options.correlationId,
			outcome: "exception",
		});
		throw cause;
	}

	input.dependencies.runtime.observability.recordOperation(
		result.ok
			? {
					operationId: operation.id,
					kind: operation.kind,
					owner: operation.owner,
					observabilityClass: operation.observabilityClass,
					correlationId: input.options.correlationId,
					outcome: "success",
				}
			: {
					operationId: operation.id,
					kind: operation.kind,
					owner: operation.owner,
					observabilityClass: operation.observabilityClass,
					correlationId: input.options.correlationId,
					outcome: "failure",
					errorCode: result.code,
				},
	);
	return result;
}
