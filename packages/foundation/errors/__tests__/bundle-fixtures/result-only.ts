/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */
import { errorResult } from "@afenda/errors";

export const bundleFixtureResult = errorResult.fail("NOT_FOUND", {
	publicMessage: "The requested record could not be found",
});
