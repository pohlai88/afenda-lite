/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Sealed: root capabilities only; obey docs/CONTRACT.md and package gates.
 */

import { resultContext, withResultContext } from "../result/context";
import { fail } from "../result/fail";
import { ok } from "../result/ok";
import { retryAfterSeconds } from "../security/normalize";

export const errorResult = Object.freeze({
	context: resultContext,
	fail,
	ok,
	retryAfterSeconds,
	withContext: withResultContext,
});
