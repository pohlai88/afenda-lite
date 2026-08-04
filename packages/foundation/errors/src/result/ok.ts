/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Sealed: root capabilities only; obey docs/CONTRACT.md and package gates.
 */

import type { ResultSuccess } from "../public-types";

export function ok<Data>(data: Data): ResultSuccess<Data> {
	return Object.freeze({ data, ok: true });
}
