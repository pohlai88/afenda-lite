/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Sealed: root capabilities only; obey docs/CONTRACT.md and package gates.
 */

import { errorWire } from "@afenda/errors";

const failure = errorWire.deserialize({
	code: "SERVICE_UNAVAILABLE",
	message: "A required service is temporarily unavailable.",
});

export const bundleFixtureWire = errorWire.serialize(failure);
