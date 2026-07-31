/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
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
