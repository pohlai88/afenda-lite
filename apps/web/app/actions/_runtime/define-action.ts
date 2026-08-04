import type { Session } from "@afenda/auth";
import type { Result as ActionResult, Result } from "@afenda/errors";

import { withHrSessionContext } from "@/app/actions/hr-mutation-context";
import { mapPackageResult } from "@/app/actions/map-package-result";
import type { OperatorPermissionActionInput } from "@/app/actions/run-operator-permission-action";
import type { ProductPermissionCode } from "@/modules/identity/domain/session-permission";
import { parseSchema } from "@/modules/platform/schemas/common";

/**
 * The one declarative Server Action envelope (APP-SCAFFOLDING §5.3).
 *
 * Authorization, session admission, correlation, denial telemetry, and the
 * internal-error envelope are decided once, by the runner (§5.2). Everything
 * this function does — parse, stamp, delegate, project — is mechanical, which
 * is exactly why it must not be re-expressed as a hand-written wrapper per
 * feature. Fourteen such wrappers existed before this; each was free to diverge
 * on error mapping and telemetry, and several had.
 */

/** A runner from §5.2. Actor admission is the runner's decision, not this one's. */
export type ActionRunner = <T>(
	input: OperatorPermissionActionInput<T>,
) => Promise<ActionResult<T>>;

export interface ActionDefinition<
	TData,
	TPayload extends Record<string, unknown>,
> {
	readonly input: unknown;
	/** The single package facade call. */
	readonly invoke: (
		stamped: Record<string, unknown>,
		context: { readonly session: Session; readonly correlationId: string },
	) => Promise<Result<TData>>;
	/**
	 * Validation failure, constructed at the call site.
	 *
	 * This is a thunk rather than a `validationMessage: string` because
	 * `@afenda/errors` accepts a `publicMessage` only as an authored string
	 * literal — `IsAuthoredStringLiteral` rejects any dynamically-typed value so
	 * runtime-composed text can never reach a public error message. A message
	 * threaded through a config field arrives typed `string` and is refused, which
	 * is why the previous `validationMessage` field was dead at all 216 call sites
	 * that passed one. Keeping construction at the call site preserves the literal
	 * and delivers the message the author actually wrote.
	 */
	readonly onInvalid: () => ActionResult<TPayload>;
	readonly path: string;
	readonly permission: ProductPermissionCode;
	/** Shape the package result into the action payload. */
	readonly project: (data: TData) => TPayload;
	/** Which actor class admits this action. */
	readonly runner: ActionRunner;
	readonly safeMessage: string;
	readonly schema: Parameters<typeof parseSchema>[0];
}

export async function defineAction<
	TData,
	TPayload extends Record<string, unknown>,
>(
	definition: ActionDefinition<TData, TPayload>,
): Promise<ActionResult<TPayload>> {
	return await definition.runner<TPayload>({
		path: definition.path,
		permission: definition.permission,
		safeMessage: definition.safeMessage,
		execute: async (session, correlationId) => {
			const parsed = parseSchema(definition.schema, definition.input);
			if (!parsed.success) {
				return definition.onInvalid();
			}
			// Identity is stamped from trusted session state after parsing, so a
			// parsed field can never supply or override organization/actor.
			const stamped = withHrSessionContext(
				session,
				correlationId,
				parsed.data as Record<string, unknown>,
			);
			const mapped = mapPackageResult(
				await definition.invoke(stamped, { session, correlationId }),
			);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: definition.project(mapped.data) };
		},
	});
}
