/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Sealed: root capabilities only; obey docs/CONTRACT.md and package gates.
 */

import { diagnostics } from "../project/diagnostics";
import { http } from "../project/http";
import { result } from "../project/result";
import { retry } from "../project/retry";

export const errorProject = Object.freeze({
	diagnostics,
	http,
	result,
	retry,
});
