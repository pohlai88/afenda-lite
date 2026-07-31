/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import { errorWire } from "@afenda/errors";

const failure = errorWire.deserialize({
	code: "SERVICE_UNAVAILABLE",
	message: "A required service is temporarily unavailable.",
});

export const bundleFixtureWire = errorWire.serialize(failure);
