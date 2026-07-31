/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import type { ResultSuccess } from "../public-types";

export function ok<Data>(data: Data): ResultSuccess<Data> {
	return Object.freeze({ data, ok: true });
}
